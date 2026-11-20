// ==============================================================================
// Module gọi API bằng axios + Quản lý Token & Phiên đăng nhập dùng chung (auth)
// ==============================================================================
// Cách dùng trong các file js/pages/*.js:
//   const books = await api.get("/books/search", { keyword: "Python" });
//   const loan  = await api.post("/loans/online", { book_isbns: ["9786042100001"] });
//   const user  = auth.getUser(); // { id, email, full_name, role, status }
// ==============================================================================

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status; // mã HTTP: 400, 401, 403, 404, 422, 500... (0 = lỗi mạng)
    this.data = data;     // dữ liệu JSON gốc từ FastAPI
  }
}

// ---------- Quản lý Token & Thông tin người dùng (auth) ----------
const auth = {
  getToken() {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("access_token") ||
      null
    );
  },

  setToken(token, remember = true) {
    if (!token) return;
    if (remember) {
      localStorage.setItem("access_token", token);
      localStorage.setItem("token", token);
    } else {
      sessionStorage.setItem("access_token", token);
      localStorage.setItem("access_token", token);
      localStorage.setItem("token", token);
    }
  },

  getUser() {
    try {
      const raw = localStorage.getItem("user_info") || sessionStorage.getItem("user_info");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (!user) return;
    localStorage.setItem("user_info", JSON.stringify(user));
  },

  getCard() {
    try {
      const raw = localStorage.getItem("library_card");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCard(card) {
    if (card) {
      localStorage.setItem("library_card", JSON.stringify(card));
    } else {
      localStorage.removeItem("library_card");
    }
  },

  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  isLoggedIn() {
    return Boolean(this.getToken() && this.getUser());
  },

  clearSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_info");
    localStorage.removeItem("library_card");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user_info");
  },

  // Đường dẫn trang mặc định theo từng Role sau khi đăng nhập
  getHomeUrlByRole(role, root = "./") {
    if (role === "ADMIN" || role === "LIBRARIAN") {
      return `${root}pages/staff-dashboard.html`;
    }
    return `${root}index.html`;
  },

  // Đồng bộ lại thông tin user từ endpoint /api/auth/me
  async syncSession() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const user = await api.get("/auth/me");
      this.setUser(user);
      if (user.role === "READER") {
        try {
          const card = await api.get("/auth/my-card");
          if (card) this.setCard(card);
        } catch {
          // Bỏ qua nếu chưa có thẻ
        }
      }
      return user;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        this.clearSession();
      }
      return null;
    }
  },
};

// ---------- Khởi tạo Axios Instance (an toàn không gây crash nếu chưa tải được thư viện) ----------
const http = typeof axios !== "undefined"
  ? axios.create({
      baseURL: CONFIG.API_BASE_URL,
      timeout: 10000,
      headers: { "Content-Type": "application/json" },
    })
  : {
      interceptors: { request: { use: () => {} }, response: { use: () => {} } },
      get: async () => [],
      post: async () => ({}),
      put: async () => ({}),
      patch: async () => ({}),
      delete: async () => ({}),
    };

// 1. Request Interceptor: Tự động gắn JWT Bearer Token vào mọi request
http.interceptors.request.use(
  (config) => {
    const token = auth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Lấy thông báo lỗi tiếng Việt rõ ràng từ response của FastAPI
function getErrorMessage(data, status) {
  if (data && typeof data.detail === "string") return data.detail;
  // Lỗi 422 (dữ liệu đầu vào sai): detail là mảng [{ loc: [...], msg: "..." }]
  if (data && Array.isArray(data.detail)) {
    return data.detail.map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join("; ");
  }
  if (status === 401) return "Phiên đăng nhập đã hết hạn hoặc chưa xác thực (401).";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này hoặc tài khoản đã bị khóa (403).";
  if (status === 404) return "Không tìm thấy dữ liệu yêu cầu (404).";
  return `Lỗi máy chủ (${status})`;
}

// 2. Response Interceptor: Gom xử lý lỗi & tự động xử lý khi token hết hạn (401)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const reqUrl = config?.url || "";

      // Nếu 401 ở các API nghiệp vụ (không phải lúc đang bấm nút login), xoá phiên cũ
      if (status === 401 && !reqUrl.includes("/auth/login")) {
        auth.clearSession();
      }

      return Promise.reject(new ApiError(getErrorMessage(data, status), status, data));
    }

    return Promise.reject(
      new ApiError(
        "Không kết nối được backend. Backend đã chạy chưa? Kiểm tra CONFIG.API_BASE_URL.",
        0,
        null
      )
    );
  }
);

// ---------- Các hàm gọi API tiện lợi ----------
const api = {
  get: (path, params) => http.get(path, { params }).then((res) => res.data),
  post: (path, body) => http.post(path, body).then((res) => res.data),
  put: (path, body) => http.put(path, body).then((res) => res.data),
  patch: (path, body) => http.patch(path, body).then((res) => res.data),
  delete: (path) => http.delete(path).then((res) => res.data),
};
