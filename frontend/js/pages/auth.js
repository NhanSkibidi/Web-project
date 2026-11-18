// ==============================================================================
// KS25 Library - Authentication Logic (Login & Register + Đa ngôn ngữ VN / EN / JP)
// ==============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Đảm bảo chỉ dùng giao diện Sáng chuẩn thiết kế (xoá dark theme cũ nếu từng lưu)
  document.documentElement.removeAttribute("data-theme");
  localStorage.removeItem("ks25_theme");

  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegisterBtn = document.getElementById("tab-register-btn");
  const loginPane = document.getElementById("login-pane");
  const registerPane = document.getElementById("register-pane");
  const userActiveCard = document.getElementById("user-active-card");
  const authTabsContainer = document.getElementById("auth-tabs-container");

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginAlert = document.getElementById("login-alert");
  const registerAlert = document.getElementById("register-alert");

  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const loginRememberInput = document.getElementById("login-remember");
  const btnLoginSubmit = document.getElementById("btn-login-submit");
  const btnRegisterSubmit = document.getElementById("btn-register-submit");

  const langBtns = document.querySelectorAll(".lang-btn");

  // ---------- 0. ĐA NGÔN NGỮ: TIẾNG VIỆT (vi) · ENGLISH (en) · 日本語 (ja) ----------
  const I18N = {
    vi: {
      pageTitle: "Đăng nhập & Đăng ký | Thư viện số KS25",
      introTitle: "Thư viện số KS25",
      introSubtitle: "Tra cứu sách, theo dõi thẻ và mượn sách trực tuyến.",
      searchTitle: "Tra cứu nhanh danh mục sách",
      searchPlaceholder: "Tên sách, tác giả, ISBN...",
      catAll: "Tất cả thể loại",
      cat1: "Công nghệ thông tin",
      cat2: "Văn học",
      cat3: "Kinh tế",
      cat4: "Kỹ năng sống",
      cat5: "Lịch sử",
      cat6: "Khoa học",
      cat7: "Tâm lý học",
      searchBtnText: "Tra cứu",
      tagLabel: "Gợi ý tìm kiếm:",
      tag1: "Giáo trình Kinh tế",
      tag2: "Khoa học máy tính",
      tag3: "Văn học cổ điển",
      tag4: "Kỹ năng sống",
      ruleCardTitle: "Quy định mượn trả",
      rule1: "Mượn tối đa 5 cuốn mỗi lần",
      rule2: "Phạt quá hạn 2.000 đ/cuốn/ngày",
      hourCardTitle: "Giờ phục vụ & Liên hệ",
      hour1: "Thứ 2 – Thứ 7: 07:30 – 21:00",
      hour2: "thuvien@ks25.edu.vn",
      rfidTitle: "Thẻ Sinh Viên Tích Hợp RFID",
      rfidDesc: "Chạm nhẹ tại cổng kiểm soát hoặc ki-ốt tự phục vụ",
      tabLogin: "Đăng nhập",
      tabRegister: "Đăng ký",
      labelLoginEmail: "Địa chỉ Email",
      loginEmailPlaceholder: "nguyen.vana@ks25.edu.vn hoặc docgia01@library.com",
      loginEmailHelper: "ⓘ Vui lòng sử dụng email hợp lệ do trường cung cấp",
      labelLoginPass: "Mật khẩu",
      forgotPass: "Quên mật khẩu?",
      forgotAlert: "Vui lòng liên hệ quầy thủ thư hoặc email thuvien@ks25.edu.vn để đặt lại mật khẩu.",
      loginPassPlaceholder: "Nhập mật khẩu...",
      rememberMe: "Ghi nhớ phiên đăng nhập trên thiết bị này",
      btnLogin: "Đăng nhập →",
      btnLoggingIn: "Đang xác thực...",
      demoTitle: "Tài khoản demo nhanh:",
      demoReader: "Độc giả",
      demoLibrarian: "Thủ thư",
      demoAdmin: "Quản trị",
      authNote: "Lưu ý: Bạn đọc cần kích hoạt thẻ thư viện tại quầy để hoàn tất quyền mượn sách.",
      labelStudentCode: "Mã số sinh viên / Cán bộ (*)",
      badge8Digits: "8 chữ số",
      studentCodePlaceholder: "Ví dụ: 25010412",
      labelFullname: "Họ và tên bạn đọc (*)",
      fullnamePlaceholder: "Ví dụ: Nguyễn Văn An",
      labelRegEmail: "Địa chỉ Email trường cấp (*)",
      regEmailPlaceholder: "an.nguyen23@ks25.edu.vn",
      regEmailHelper: "ⓘ Hệ thống tự động tạo thẻ thư viện (LC-xxxx) hiệu lực 1 năm",
      labelPhone: "Số điện thoại liên hệ",
      phonePlaceholder: "Ví dụ: 0912345678",
      labelRegPass: "Mật khẩu (*)",
      regPassPlaceholder: "Tối thiểu 8 ký tự",
      labelRegPassConfirm: "Xác nhận lại (*)",
      regPassConfirmPlaceholder: "Nhập lại mật khẩu",
      termsHtml: "Tôi đã đọc và đồng ý tuân thủ <strong>Quy chế Thư viện số KS25</strong> và cam kết bảo quản tài liệu.",
      btnRegister: "Tạo tài khoản bạn đọc →",
      btnRegistering: "Đang khởi tạo thẻ & tài khoản...",
      metaEmail: "Email tài khoản:",
      metaPhone: "Số điện thoại:",
      metaCard: "Thẻ thư viện:",
      metaStatus: "Trạng thái:",
      statusActive: "Đang hoạt động (ACTIVE)",
      btnSwitchAcc: "Đổi tài khoản",
      btnLogout: "Đăng xuất",
      footerCopy: "© 2026 Thư viện số KS25. Bảo lưu mọi quyền.",
      footerLink1: "Quy chế thư viện",
      footerLink2: "Chính sách bảo mật",
      footerLink3: "Trung tâm trợ giúp",
      footerLink4: "Hỗ trợ sinh viên",
      searchingText: "Đang tra cứu danh mục sách...",
      noBooksFound: "Không tìm thấy đầu sách phù hợp.",
      searchErr: "Không kết nối được máy chủ tra cứu sách.",
    },
    en: {
      pageTitle: "Sign In & Register | KS25 Digital Library",
      introTitle: "KS25 Digital Library",
      introSubtitle: "Search catalog, track your library card, and borrow books online.",
      searchTitle: "Quick Catalog Search",
      searchPlaceholder: "Book title, author, ISBN...",
      catAll: "All Categories",
      cat1: "Information Technology",
      cat2: "Literature",
      cat3: "Economics",
      cat4: "Life Skills",
      cat5: "History",
      cat6: "Science",
      cat7: "Psychology",
      searchBtnText: "Search",
      tagLabel: "Popular tags:",
      tag1: "Economics",
      tag2: "Computer Science",
      tag3: "Classic Literature",
      tag4: "Life Skills",
      ruleCardTitle: "Borrowing Rules",
      rule1: "Borrow up to 5 books per loan",
      rule2: "Overdue fine: 2,000 VND/book/day",
      hourCardTitle: "Opening Hours & Contact",
      hour1: "Mon – Sat: 07:30 – 21:00",
      hour2: "thuvien@ks25.edu.vn",
      rfidTitle: "RFID Integrated Student Card",
      rfidDesc: "Tap lightly at security gates or self-service kiosks",
      tabLogin: "Sign In",
      tabRegister: "Register",
      labelLoginEmail: "Email Address",
      loginEmailPlaceholder: "nguyen.vana@ks25.edu.vn or docgia01@library.com",
      loginEmailHelper: "ⓘ Please use a valid university-issued email address",
      labelLoginPass: "Password",
      forgotPass: "Forgot password?",
      forgotAlert: "Please contact the librarian desk or email thuvien@ks25.edu.vn to reset your password.",
      loginPassPlaceholder: "Enter your password...",
      rememberMe: "Remember my session on this device",
      btnLogin: "Sign In →",
      btnLoggingIn: "Authenticating...",
      demoTitle: "Quick Demo Accounts:",
      demoReader: "Reader",
      demoLibrarian: "Librarian",
      demoAdmin: "Admin",
      authNote: "Note: Readers need to activate their library card at the counter to unlock full borrowing privileges.",
      labelStudentCode: "Student / Staff ID (*)",
      badge8Digits: "8 digits",
      studentCodePlaceholder: "e.g. 25010412",
      labelFullname: "Full Name (*)",
      fullnamePlaceholder: "e.g. Nguyen Van An",
      labelRegEmail: "University Email (*)",
      regEmailPlaceholder: "an.nguyen23@ks25.edu.vn",
      regEmailHelper: "ⓘ Automatically issues a 1-year library card (LC-xxxx)",
      labelPhone: "Phone Number",
      phonePlaceholder: "e.g. 0912345678",
      labelRegPass: "Password (*)",
      regPassPlaceholder: "Min 8 characters",
      labelRegPassConfirm: "Confirm Password (*)",
      regPassConfirmPlaceholder: "Re-enter password",
      termsHtml: "I have read and agree to the <strong>KS25 Library Regulations</strong> and pledge to preserve materials.",
      btnRegister: "Create Reader Account →",
      btnRegistering: "Creating account & card...",
      metaEmail: "Account Email:",
      metaPhone: "Phone Number:",
      metaCard: "Library Card:",
      metaStatus: "Account Status:",
      statusActive: "Active (ACTIVE)",
      btnSwitchAcc: "Switch Account",
      btnLogout: "Sign Out",
      footerCopy: "© 2026 KS25 Digital Library. All rights reserved.",
      footerLink1: "Library Rules",
      footerLink2: "Privacy Policy",
      footerLink3: "Help Center",
      footerLink4: "Student Support",
      searchingText: "Searching book catalog...",
      noBooksFound: "No matching books found.",
      searchErr: "Unable to connect to catalog search server.",
    },
    ja: {
      pageTitle: "ログイン・新規登録 | KS25 デジタル図書館",
      introTitle: "KS25 デジタル図書館",
      introSubtitle: "蔵書検索、図書館カード管理、オンライン貸出予約サービス。",
      searchTitle: "蔵書クイック検索",
      searchPlaceholder: "書名、著者名、ISBNで検索...",
      catAll: "すべての分野",
      cat1: "情報技術・IT",
      cat2: "文学・小説",
      cat3: "経済・ビジネス",
      cat4: "ライフスキル",
      cat5: "歴史",
      cat6: "自然科学",
      cat7: "心理学",
      searchBtnText: "検索",
      tagLabel: "人気のキーワード:",
      tag1: "経済学テキスト",
      tag2: "コンピュータ科学",
      tag3: "古典文学",
      tag4: "ライフスキル",
      ruleCardTitle: "貸出・返却規定",
      rule1: "1回につき最大5冊まで貸出可能",
      rule2: "延滞料：1冊1日あたり 2,000 VND",
      hourCardTitle: "開館時間・お問い合わせ",
      hour1: "月曜〜土曜：07:30 – 21:00",
      hour2: "thuvien@ks25.edu.vn",
      rfidTitle: "RFID搭載スマート学生証",
      rfidDesc: "入退館ゲートや自動貸出機にかざすだけで利用可能",
      tabLogin: "ログイン",
      tabRegister: "新規登録",
      labelLoginEmail: "メールアドレス",
      loginEmailPlaceholder: "nguyen.vana@ks25.edu.vn または docgia01@library.com",
      loginEmailHelper: "ⓘ 大学から発行された有効なメールアドレスをご使用ください",
      labelLoginPass: "パスワード",
      forgotPass: "パスワードをお忘れですか？",
      forgotAlert: "パスワードの再設定は、図書館カウンターまたは thuvien@ks25.edu.vn までお問い合わせください。",
      loginPassPlaceholder: "パスワードを入力...",
      rememberMe: "この端末でログイン状態を保持する",
      btnLogin: "ログイン →",
      btnLoggingIn: "認証中...",
      demoTitle: "クイックデモアカウント:",
      demoReader: "利用者 (Reader)",
      demoLibrarian: "司書 (Librarian)",
      demoAdmin: "管理者 (Admin)",
      authNote: "ご注意：貸出機能をご利用いただくには、カウンターでの図書館カード有効化が必要です。",
      labelStudentCode: "学籍番号 / 職員番号 (*)",
      badge8Digits: "8桁の数字",
      studentCodePlaceholder: "例：25010412",
      labelFullname: "氏名 (*)",
      fullnamePlaceholder: "例：Nguyen Van An",
      labelRegEmail: "大学メールアドレス (*)",
      regEmailPlaceholder: "an.nguyen23@ks25.edu.vn",
      regEmailHelper: "ⓘ 登録時に1年間有効な図書館カード（LC-xxxx）が自動発行されます",
      labelPhone: "電話番号",
      phonePlaceholder: "例：0912345678",
      labelRegPass: "パスワード (*)",
      regPassPlaceholder: "8文字以上",
      labelRegPassConfirm: "パスワード確認 (*)",
      regPassConfirmPlaceholder: "もう一度入力",
      termsHtml: "<strong>KS25 デジタル図書館利用規約</strong>を読み、資料を大切に扱うことに同意します。",
      btnRegister: "利用者アカウントを作成 →",
      btnRegistering: "アカウント・カード作成中...",
      metaEmail: "メールアドレス:",
      metaPhone: "電話番号:",
      metaCard: "図書館カード:",
      metaStatus: "ステータス:",
      statusActive: "有効 (ACTIVE)",
      btnSwitchAcc: "アカウント切替",
      btnLogout: "ログアウト",
      footerCopy: "© 2026 KS25 デジタル図書館. All rights reserved.",
      footerLink1: "図書館利用規約",
      footerLink2: "プライバシーポリシー",
      footerLink3: "ヘルプセンター",
      footerLink4: "学生サポート",
      searchingText: "蔵書データベースを検索中...",
      noBooksFound: "該当する書籍が見つかりませんでした。",
      searchErr: "検索サーバーに接続できません。",
    },
  };

  let currentLang = localStorage.getItem("ks25_lang") || "vi";
  if (!I18N[currentLang]) currentLang = "vi";

  function applyLanguage(lang) {
    currentLang = I18N[lang] ? lang : "vi";
    localStorage.setItem("ks25_lang", currentLang);
    document.documentElement.lang = currentLang;

    const t = I18N[currentLang];
    document.title = t.pageTitle;

    // Cập nhật trạng thái nút VN / EN / JP
    langBtns.forEach((b) => {
      const btnCode = (b.getAttribute("data-lang") || b.textContent.trim()).toLowerCase();
      const normalized = btnCode === "vn" ? "vi" : btnCode === "jp" ? "ja" : btnCode;
      b.classList.toggle("active", normalized === currentLang);
    });

    // Cột trái
    const introTitle = document.querySelector(".intro-title");
    const introSub = document.querySelector(".intro-subtitle");
    if (introTitle) introTitle.textContent = t.introTitle;
    if (introSub) introSub.textContent = t.introSubtitle;

    const searchCardTitle = document.querySelector(".search-card-title");
    if (searchCardTitle) {
      const svg = searchCardTitle.querySelector("svg")?.outerHTML || "";
      searchCardTitle.innerHTML = `${svg} ${t.searchTitle}`;
    }

    const qInput = document.getElementById("quick-search-input");
    if (qInput) qInput.placeholder = t.searchPlaceholder;

    const qSelect = document.getElementById("quick-search-category");
    if (qSelect && qSelect.options.length >= 8) {
      qSelect.options[0].textContent = t.catAll;
      qSelect.options[1].textContent = t.cat1;
      qSelect.options[2].textContent = t.cat2;
      qSelect.options[3].textContent = t.cat3;
      qSelect.options[4].textContent = t.cat4;
      qSelect.options[5].textContent = t.cat5;
      qSelect.options[6].textContent = t.cat6;
      qSelect.options[7].textContent = t.cat7;
    }

    const qBtn = document.getElementById("quick-search-btn");
    if (qBtn) {
      const svg = qBtn.querySelector("svg")?.outerHTML || "";
      qBtn.innerHTML = `${svg} ${t.searchBtnText}`;
    }

    const tagLabel = document.querySelector(".tag-label");
    if (tagLabel) tagLabel.textContent = t.tagLabel;
    const tagPills = document.querySelectorAll(".tag-pill");
    if (tagPills.length >= 4) {
      tagPills[0].textContent = t.tag1;
      tagPills[1].textContent = t.tag2;
      tagPills[2].textContent = t.tag3;
      tagPills[3].textContent = t.tag4;
    }

    const infoCards = document.querySelectorAll(".info-card");
    if (infoCards.length >= 2) {
      const h1 = infoCards[0].querySelector(".info-card-header");
      if (h1) h1.innerHTML = `${h1.querySelector("svg")?.outerHTML || ""} ${t.ruleCardTitle}`;
      const li1 = infoCards[0].querySelectorAll("li");
      if (li1.length >= 2) {
        li1[0].textContent = t.rule1;
        li1[1].textContent = t.rule2;
      }

      const h2 = infoCards[1].querySelector(".info-card-header");
      if (h2) h2.innerHTML = `${h2.querySelector("svg")?.outerHTML || ""} ${t.hourCardTitle}`;
      const li2 = infoCards[1].querySelectorAll("li");
      if (li2.length >= 2) {
        li2[0].textContent = t.hour1;
        li2[1].textContent = t.hour2;
      }
    }

    const rfidTitle = document.querySelector(".rfid-title");
    const rfidDesc = document.querySelector(".rfid-desc");
    if (rfidTitle) rfidTitle.textContent = t.rfidTitle;
    if (rfidDesc) rfidDesc.textContent = t.rfidDesc;

    // Cột phải - Tabs & Login Form
    if (tabLoginBtn) tabLoginBtn.textContent = t.tabLogin;
    if (tabRegisterBtn) tabRegisterBtn.textContent = t.tabRegister;

    const lblLoginEmail = document.querySelector('label[for="login-email"]');
    if (lblLoginEmail) lblLoginEmail.textContent = t.labelLoginEmail;
    if (loginEmailInput) loginEmailInput.placeholder = t.loginEmailPlaceholder;

    const loginHelpers = loginPane?.querySelectorAll(".form-helper span");
    if (loginHelpers && loginHelpers[0]) loginHelpers[0].textContent = t.loginEmailHelper;

    const lblLoginPass = document.querySelector('label[for="login-password"]');
    if (lblLoginPass) lblLoginPass.textContent = t.labelLoginPass;
    const forgotLink = loginPane?.querySelector(".form-link");
    if (forgotLink) {
      forgotLink.textContent = t.forgotPass;
      forgotLink.onclick = (e) => {
        e.preventDefault();
        alert(t.forgotAlert);
      };
    }
    if (loginPasswordInput) loginPasswordInput.placeholder = t.loginPassPlaceholder;

    const remSpan = loginRememberInput?.parentElement?.querySelector("span");
    if (remSpan) remSpan.textContent = t.rememberMe;

    if (btnLoginSubmit && !btnLoginSubmit.disabled) {
      btnLoginSubmit.innerHTML = `<span>${t.btnLogin}</span>`;
    }

    const demoTitle = document.querySelector(".demo-title");
    if (demoTitle) demoTitle.textContent = t.demoTitle;
    const demoReaderBtn = document.querySelector('.demo-btn[data-role="reader"]');
    const demoLibBtn = document.querySelector('.demo-btn[data-role="librarian"]');
    const demoAdminBtn = document.querySelector('.demo-btn[data-role="admin"]');
    if (demoReaderBtn) demoReaderBtn.textContent = t.demoReader;
    if (demoLibBtn) demoLibBtn.textContent = t.demoLibrarian;
    if (demoAdminBtn) demoAdminBtn.textContent = t.demoAdmin;

    document.querySelectorAll(".auth-note").forEach((n) => {
      n.textContent = t.authNote;
    });

    // Register Form
    const lblStu = document.querySelector('label[for="reg-student-code"]');
    if (lblStu) lblStu.textContent = t.labelStudentCode;
    const badgeHint = registerPane?.querySelector(".form-badge-hint");
    if (badgeHint) badgeHint.textContent = t.badge8Digits;
    const stuInput = document.getElementById("reg-student-code");
    if (stuInput) stuInput.placeholder = t.studentCodePlaceholder;

    const lblName = document.querySelector('label[for="reg-fullname"]');
    if (lblName) lblName.textContent = t.labelFullname;
    const nameInput = document.getElementById("reg-fullname");
    if (nameInput) nameInput.placeholder = t.fullnamePlaceholder;

    const lblRegEmail = document.querySelector('label[for="reg-email"]');
    if (lblRegEmail) lblRegEmail.textContent = t.labelRegEmail;
    const regEmailInput = document.getElementById("reg-email");
    if (regEmailInput) regEmailInput.placeholder = t.regEmailPlaceholder;
    const regHelpers = registerPane?.querySelectorAll(".form-helper span");
    if (regHelpers && regHelpers[0]) regHelpers[0].textContent = t.regEmailHelper;

    const lblPhone = document.querySelector('label[for="reg-phone"]');
    if (lblPhone) lblPhone.textContent = t.labelPhone;
    const phoneInput = document.getElementById("reg-phone");
    if (phoneInput) phoneInput.placeholder = t.phonePlaceholder;

    const lblRegPass = document.querySelector('label[for="reg-password"]');
    if (lblRegPass) lblRegPass.textContent = t.labelRegPass;
    const regPassInput = document.getElementById("reg-password");
    if (regPassInput) regPassInput.placeholder = t.regPassPlaceholder;

    const lblRegConfirm = document.querySelector('label[for="reg-password-confirm"]');
    if (lblRegConfirm) lblRegConfirm.textContent = t.labelRegPassConfirm;
    const regConfirmInput = document.getElementById("reg-password-confirm");
    if (regConfirmInput) regConfirmInput.placeholder = t.regPassConfirmPlaceholder;

    const termsSpan = document.getElementById("reg-terms")?.parentElement?.querySelector("span");
    if (termsSpan) termsSpan.innerHTML = t.termsHtml;

    if (btnRegisterSubmit && !btnRegisterSubmit.disabled) {
      btnRegisterSubmit.innerHTML = `<span>${t.btnRegister}</span>`;
    }

    // User Active Card
    const metaRows = userActiveCard?.querySelectorAll(".user-meta-row");
    if (metaRows && metaRows.length >= 4) {
      metaRows[0].querySelector(".meta-label").textContent = t.metaEmail;
      metaRows[1].querySelector(".meta-label").textContent = t.metaPhone;
      metaRows[2].querySelector(".meta-label").textContent = t.metaCard;
      metaRows[3].querySelector(".meta-label").textContent = t.metaStatus;
      const statusSpan = metaRows[3].querySelector("span:last-child");
      if (statusSpan) statusSpan.textContent = t.statusActive;
    }

    const switchAccBtn = document.getElementById("btn-switch-account");
    const logoutBtn = document.getElementById("btn-logout");
    if (switchAccBtn) switchAccBtn.textContent = t.btnSwitchAcc;
    if (logoutBtn) logoutBtn.textContent = t.btnLogout;

    // Footer
    const footerCopy = document.querySelector(".auth-footer-inner > div:first-child");
    if (footerCopy) footerCopy.textContent = t.footerCopy;
    const footerLinks = document.querySelectorAll(".auth-footer-links a");
    const footerAlerts =
      currentLang === "en"
        ? [
            "Library Rules: Borrow up to 5 books for 14 days. Overdue fine: 2,000 VND/day.",
            "Privacy Policy: Passwords are hashed with bcrypt and sessions are secured via JWT.",
            "Help Center: Visit the 1st-floor library counter or call 0900.000.001.",
            "Student Support: Bring your student ID to the counter to sync RFID.",
          ]
        : currentLang === "ja"
        ? [
            "利用規約：1回につき最大5冊・14日間貸出可能。延滞料は1日2,000 VNDです。",
            "プライバシーポリシー：パスワードはbcryptで暗号化され、JWTで安全に管理されます。",
            "ヘルプセンター：1階カウンターまたはホットライン 0900.000.001 までご連絡ください。",
            "学生サポート：新入生はカウンターにて学生証のRFID連携を行ってください。",
          ]
        : [
            "Quy chế Thư viện: Mỗi độc giả được mượn tối đa 5 cuốn sách trong thời hạn 14 ngày. Phạt quá hạn 2.000đ/ngày.",
            "Chính sách bảo mật: Toàn bộ mật khẩu được băm an toàn chuẩn bcrypt, thông tin thẻ mã hóa JWT.",
            "Hỗ trợ: Liên hệ bàn thủ thư quầy tầng 1 hoặc hotline 0900.000.001",
            "Hỗ trợ sinh viên: Sinh viên khóa mới mang thẻ SV tới quầy để đồng bộ RFID tự động.",
          ];
    if (footerLinks.length >= 4) {
      footerLinks[0].textContent = t.footerLink1;
      footerLinks[1].textContent = t.footerLink2;
      footerLinks[2].textContent = t.footerLink3;
      footerLinks[3].textContent = t.footerLink4;
      footerLinks.forEach((link, idx) => {
        link.onclick = (e) => {
          e.preventDefault();
          alert(footerAlerts[idx]);
        };
      });
    }

    // Nếu đang ở trạng thái đã đăng nhập, cập nhật lại nhãn role & nút điều hướng theo ngôn ngữ mới
    if (userActiveCard && userActiveCard.style.display === "block" && auth.getUser()) {
      showUserCard(auth.getUser(), auth.getCard());
    }
  }

  langBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = (btn.getAttribute("data-lang") || btn.textContent.trim()).toLowerCase();
      const targetLang = code === "en" ? "en" : code === "ja" || code === "jp" ? "ja" : "vi";
      applyLanguage(targetLang);
    });
  });

  // Khởi tạo ngôn ngữ ngay khi mở trang
  applyLanguage(currentLang);

  // ---------- 1. Chuyển đổi Tab Đăng nhập / Đăng ký ----------
  function switchTab(tab) {
    if (tab === "register") {
      tabRegisterBtn?.classList.add("active");
      tabLoginBtn?.classList.remove("active");
      registerPane?.classList.add("active");
      loginPane?.classList.remove("active");
      if (registerPane) registerPane.style.display = "block";
      if (loginPane) loginPane.style.display = "none";
      window.location.hash = "register";
    } else {
      tabLoginBtn?.classList.add("active");
      tabRegisterBtn?.classList.remove("active");
      loginPane?.classList.add("active");
      registerPane?.classList.remove("active");
      if (loginPane) loginPane.style.display = "block";
      if (registerPane) registerPane.style.display = "none";
      window.location.hash = "login";
    }
    hideAlerts();
  }

  tabLoginBtn?.addEventListener("click", () => switchTab("login"));
  tabRegisterBtn?.addEventListener("click", () => switchTab("register"));

  if (window.location.hash === "#register") {
    switchTab("register");
  } else {
    switchTab("login");
  }

  // ---------- 2. Hiển thị thông báo ----------
  function showAlert(element, message, type = "error") {
    if (!element) return;
    element.className = `alert-box alert-${type}`;
    element.textContent = message;
    element.style.display = "block";
  }

  function hideAlerts() {
    if (loginAlert) loginAlert.style.display = "none";
    if (registerAlert) registerAlert.style.display = "none";
  }

  // ---------- 3. Ẩn / Hiện mật khẩu ----------
  document.querySelectorAll(".toggle-password-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);
      if (!targetInput) return;

      if (targetInput.type === "password") {
        targetInput.type = "text";
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        targetInput.type = "password";
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    });
  });

  // ---------- 4. Nút điền nhanh Tài khoản Demo ----------
  const DEMO_ACCOUNTS = {
    reader: {
      email: "docgia01@library.com",
      pass: "Docgia@123",
      labelVi: "Độc giả",
      labelEn: "Reader",
      labelJa: "利用者",
    },
    librarian: {
      email: "thuthu1@library.com",
      pass: "Thuthu@123",
      labelVi: "Thủ thư",
      labelEn: "Librarian",
      labelJa: "司書",
    },
    admin: {
      email: "admin@library.com",
      pass: "Admin@123",
      labelVi: "Quản trị viên",
      labelEn: "Admin",
      labelJa: "管理者",
    },
  };

  document.querySelectorAll(".demo-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const role = btn.getAttribute("data-role");
      const creds = DEMO_ACCOUNTS[role];
      if (creds && loginEmailInput && loginPasswordInput) {
        switchTab("login");
        loginEmailInput.value = creds.email;
        loginPasswordInput.value = creds.pass;
        loginEmailInput.focus();
        const msg =
          currentLang === "en"
            ? `Filled demo account [${creds.labelEn}: ${creds.email}]. Click "Sign In" to continue.`
            : currentLang === "ja"
            ? `デモアカウント [${creds.labelJa}: ${creds.email}] を入力しました。「ログイン」を押してください。`
            : `Đã điền tài khoản mẫu [${creds.labelVi}: ${creds.email}]. Bấm "Đăng nhập" để vào hệ thống.`;
        showAlert(loginAlert, msg, "success");
      }
    });
  });

  // ---------- 5. Kiểm tra phiên đăng nhập hiện tại ----------
  async function checkCurrentUser() {
    if (!auth.getToken()) return;
    const user = await auth.syncSession();
    if (user && user.id) {
      showUserCard(user, auth.getCard());
    }
  }

  function showUserCard(user, card = null) {
    if (!userActiveCard) return;

    document.getElementById("user-card-name").textContent = user.full_name || user.email;
    document.getElementById("user-card-email").textContent = user.email;
    document.getElementById("user-card-phone").textContent = user.phone || "—";

    const roleLabels =
      currentLang === "en"
        ? { ADMIN: "Administrator (ADMIN)", LIBRARIAN: "Librarian (LIBRARIAN)", READER: "Reader (READER)" }
        : currentLang === "ja"
        ? { ADMIN: "管理者 (ADMIN)", LIBRARIAN: "司書 (LIBRARIAN)", READER: "利用者 (READER)" }
        : { ADMIN: "Quản trị viên (ADMIN)", LIBRARIAN: "Thủ thư (LIBRARIAN)", READER: "Độc giả (READER)" };
    document.getElementById("user-card-role").textContent = roleLabels[user.role] || user.role;

    const cardCodeEl = document.getElementById("user-card-code");
    if (cardCodeEl) {
      cardCodeEl.textContent = card?.card_code
        ? `${card.card_code} (${card.status} · max ${card.max_borrow_books})`
        : user.role === "READER"
        ? currentLang === "en"
          ? "No card synced"
          : currentLang === "ja"
          ? "カード未連携"
          : "Chưa đồng bộ thẻ"
        : currentLang === "en"
        ? "Staff / Admin Account"
        : currentLang === "ja"
        ? "職員・管理者アカウント"
        : "Tài khoản Nhân sự / Quản trị";
    }

    const goHomeBtn = document.getElementById("btn-go-dashboard");
    if (goHomeBtn) {
      if (user.role === "ADMIN" || user.role === "LIBRARIAN") {
        goHomeBtn.href = "staff-dashboard.html";
        goHomeBtn.textContent =
          currentLang === "en"
            ? "Go to Staff Workspace →"
            : currentLang === "ja"
            ? "司書・管理ワークスペースへ →"
            : "Vào Bàn làm việc Thủ thư →";
      } else {
        goHomeBtn.href = "home.html";
        goHomeBtn.textContent =
          currentLang === "en"
            ? "Go to Library Home →"
            : currentLang === "ja"
            ? "図書館ホームへ →"
            : "Vào Trang chủ Thư viện →";
      }
    }

    const initial = (user.full_name || user.email).charAt(0).toUpperCase();
    document.getElementById("user-card-avatar").textContent = initial;

    if (loginPane) loginPane.style.display = "none";
    if (registerPane) registerPane.style.display = "none";
    if (authTabsContainer) authTabsContainer.style.display = "none";
    userActiveCard.style.display = "block";
  }

  // Nút Đăng xuất
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    auth.clearSession();
    userActiveCard.style.display = "none";
    if (authTabsContainer) authTabsContainer.style.display = "flex";
    switchTab("login");
    showAlert(
      loginAlert,
      currentLang === "en"
        ? "Signed out successfully."
        : currentLang === "ja"
        ? "ログアウトしました。"
        : "Đã đăng xuất khỏi hệ thống.",
      "success"
    );
  });

  // Nút Đổi tài khoản
  document.getElementById("btn-switch-account")?.addEventListener("click", () => {
    userActiveCard.style.display = "none";
    if (authTabsContainer) authTabsContainer.style.display = "flex";
    switchTab("login");
  });

  // ---------- 6. Xử lý Submit Form Đăng nhập ----------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    const remember = loginRememberInput ? loginRememberInput.checked : true;

    if (!email || !password) {
      showAlert(
        loginAlert,
        currentLang === "en"
          ? "Please enter both email address and password."
          : currentLang === "ja"
          ? "メールアドレスとパスワードを入力してください。"
          : "Vui lòng nhập đầy đủ địa chỉ email và mật khẩu."
      );
      return;
    }

    try {
      btnLoginSubmit.disabled = true;
      btnLoginSubmit.innerHTML = `<span>${I18N[currentLang].btnLoggingIn}</span>`;

      const res = await api.post("/auth/login", { email, password });
      auth.setToken(res.access_token, remember);

      const user = await auth.syncSession();
      if (!user) {
        throw new Error(
          currentLang === "en"
            ? "Unable to fetch user profile after login."
            : currentLang === "ja"
            ? "ログイン後のユーザー情報を取得できませんでした。"
            : "Không lấy được thông tin tài khoản sau khi đăng nhập."
        );
      }

      const savedRedirect = sessionStorage.getItem("redirect_after_login");
      sessionStorage.removeItem("redirect_after_login");

      const targetUrl =
        savedRedirect && !savedRedirect.includes("login.html") && !savedRedirect.includes("auth.html") && !savedRedirect.endsWith("index.html")
          ? savedRedirect
          : user.role === "ADMIN" || user.role === "LIBRARIAN"
          ? "staff-dashboard.html"
          : "home.html";

      showAlert(
        loginAlert,
        currentLang === "en"
          ? `Welcome back, ${user.full_name} (${user.role}). Redirecting...`
          : currentLang === "ja"
          ? `ようこそ、${user.full_name} 様 (${user.role})。画面を移動しています...`
          : `Đăng nhập thành công! Xin chào ${user.full_name} (${user.role}). Đang chuyển hướng...`,
        "success"
      );

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 650);
    } catch (err) {
      showAlert(
        loginAlert,
        err.message ||
          (currentLang === "en"
            ? "Sign in failed. Please check your credentials."
            : currentLang === "ja"
            ? "ログインに失敗しました。認証情報をご確認ください。"
            : "Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.")
      );
    } finally {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.innerHTML = `<span>${I18N[currentLang].btnLogin}</span>`;
    }
  });

  // ---------- 7. Xử lý Submit Form Đăng ký ----------
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();

    const fullName = document.getElementById("reg-fullname")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const phone = document.getElementById("reg-phone")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const confirmPassword = document.getElementById("reg-password-confirm")?.value;
    const termsChecked = document.getElementById("reg-terms")?.checked;

    if (!fullName || !email || !password || !confirmPassword) {
      showAlert(
        registerAlert,
        currentLang === "en"
          ? "Please fill in all required fields (*)."
          : currentLang === "ja"
          ? "必須項目 (*) をすべて入力してください。"
          : "Vui lòng điền đầy đủ các trường bắt buộc (*)."
      );
      return;
    }

    if (password.length < 8) {
      showAlert(
        registerAlert,
        currentLang === "en"
          ? "Password must be at least 8 characters long."
          : currentLang === "ja"
          ? "パスワードは8文字以上で入力してください。"
          : "Mật khẩu phải có độ dài tối thiểu 8 ký tự."
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert(
        registerAlert,
        currentLang === "en"
          ? "Passwords do not match."
          : currentLang === "ja"
          ? "確認用パスワードが一致しません。"
          : "Mật khẩu xác nhận lại không khớp."
      );
      return;
    }

    if (!termsChecked) {
      showAlert(
        registerAlert,
        currentLang === "en"
          ? "Please agree to the KS25 Library Regulations."
          : currentLang === "ja"
          ? "KS25 デジタル図書館利用規約に同意してください。"
          : "Vui lòng đồng ý tuân thủ Quy chế Thư viện số KS25."
      );
      return;
    }

    try {
      btnRegisterSubmit.disabled = true;
      btnRegisterSubmit.innerHTML = `<span>${I18N[currentLang].btnRegistering}</span>`;

      const payload = {
        email: email,
        password: password,
        full_name: fullName,
        phone: phone || null,
      };

      const res = await api.post("/auth/register", payload);
      if (res.user) {
        auth.setUser(res.user);
      }
      if (res.library_card) {
        auth.setCard(res.library_card);
      }

      // Tự động đăng nhập ngay sau khi đăng ký thành công để vào thẳng Trang chủ Thư viện (home.html)
      const loginRes = await api.post("/auth/login", { email, password });
      auth.setToken(loginRes.access_token, true);

      const cardCode = res.library_card?.card_code || "LC-NEW";
      showAlert(
        registerAlert,
        currentLang === "en"
          ? `Account created! Your library card is ${cardCode}. Redirecting to Library Home...`
          : currentLang === "ja"
          ? `登録完了！図書館カード番号は ${cardCode} です。図書館ホームへ移動しています...`
          : `Đăng ký thành công! Mã thẻ thư viện của bạn là ${cardCode}. Đang vào Trang chủ Thư viện...`,
        "success"
      );

      setTimeout(() => {
        window.location.href = "home.html";
      }, 900);

      registerForm.reset();
    } catch (err) {
      showAlert(
        registerAlert,
        err.message ||
          (currentLang === "en"
            ? "Registration failed. Email may already be in use."
            : currentLang === "ja"
            ? "登録に失敗しました。このメールアドレスは既に使用されている可能性があります。"
            : "Đăng ký thất bại. Email có thể đã tồn tại.")
      );
    } finally {
      btnRegisterSubmit.disabled = false;
      btnRegisterSubmit.innerHTML = `<span>${I18N[currentLang].btnRegister}</span>`;
    }
  });

  // ---------- 8. Tra cứu nhanh danh mục sách ở cột trái ----------
  const searchInput = document.getElementById("quick-search-input");
  const searchSelect = document.getElementById("quick-search-category");
  const searchBtn = document.getElementById("quick-search-btn");
  const searchResultsPreview = document.getElementById("search-results-preview");
  const searchResultsList = document.getElementById("search-results-list");

  async function executeQuickSearch(keyword) {
    if (!keyword && (!searchSelect || !searchSelect.value)) return;
    try {
      if (searchResultsPreview) searchResultsPreview.style.display = "block";
      if (searchResultsList) {
        searchResultsList.innerHTML = `<div style="padding: 10px; color: var(--color-text-muted); font-size: 13px;">${I18N[currentLang].searchingText}</div>`;
      }

      const params = { page: 1, page_size: 5 };
      if (keyword) params.keyword = keyword;
      if (searchSelect && searchSelect.value) params.category_id = searchSelect.value;

      const res = await api.get("/books/search", params);

      if (!res.items || res.items.length === 0) {
        searchResultsList.innerHTML = `<div style="padding: 8px 10px; color: var(--color-text-muted); font-size: 13px;">${I18N[currentLang].noBooksFound}</div>`;
        return;
      }

      searchResultsList.innerHTML = res.items
        .map(
          (b) => `
        <div class="search-result-item">
          <div>
            <strong>${escapeHtml(b.title)}</strong>
            <div style="font-size: 11px; color: var(--color-text-muted);">
              ${currentLang === "en" ? "Author" : currentLang === "ja" ? "著者" : "Tác giả"}: ${escapeHtml(
            b.authors?.map((a) => a.name).join(", ") ||
              (currentLang === "en" ? "Unknown" : currentLang === "ja" ? "不明" : "Chưa rõ")
          )} · ISBN: <span style="font-family: var(--font-mono);">${escapeHtml(b.isbn)}</span>
            </div>
          </div>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; background: ${
            b.available_copies > 0 ? "#ECFDF5" : "#FEF2F2"
          }; color: ${b.available_copies > 0 ? "#15803D" : "#991B1B"}; font-weight: 600;">
            ${
              b.available_copies > 0
                ? currentLang === "en"
                  ? `Available (${b.available_copies})`
                  : currentLang === "ja"
                  ? `貸出可 (${b.available_copies})`
                  : `Sẵn sàng (${b.available_copies})`
                : currentLang === "en"
                ? "Out of copies"
                : currentLang === "ja"
                ? "貸出中"
                : "Hết bản sao"
            }
          </span>
        </div>
      `
        )
        .join("");
    } catch {
      if (searchResultsList) {
        searchResultsList.innerHTML = `<div style="padding: 8px; color: var(--color-accent-danger); font-size: 12px;">${I18N[currentLang].searchErr}</div>`;
      }
    }
  }

  searchBtn?.addEventListener("click", () => {
    executeQuickSearch(searchInput.value.trim());
  });

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeQuickSearch(searchInput.value.trim());
    }
  });

  document.querySelectorAll(".tag-pill").forEach((tag) => {
    tag.addEventListener("click", () => {
      const text = tag.textContent.trim();
      if (searchInput) {
        searchInput.value = text;
        executeQuickSearch(text);
      }
    });
  });

  // Kiểm tra trạng thái đăng nhập khi mở trang
  checkCurrentUser();
});
