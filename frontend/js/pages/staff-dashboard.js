// ==============================================================================
// KS25 Library - Phân hệ Quản trị Thư viện UniLib
// Trang: Tổng quan & Thống kê Thư viện (staff-dashboard.js)
// Tách biệt hoàn toàn theo kiến trúc chuẩn: HTML + CSS + JS thuần
// ==============================================================================

(function () {
  "use strict";

  // Biến lưu trữ biểu đồ Chart.js
  let copyStatusChartInstance = null;
  let categoryBarChartInstance = null;

  // Dữ liệu mẫu theo mốc thời gian (Mock data cho các kỳ báo cáo)
  const TIME_DATA = {
    today: {
      totalBooks: "1.240",
      booksTrend: "+3 tựa sách mới hôm nay",
      totalCopies: "5.680",
      availCopies: "4.935 rảnh",
      borrowedCopies: "695 mượn",
      damagedCopies: "50 mất/hỏng",
      activeLoans: "328",
      overdueLoans: "18 phiếu quá hạn",
      activeReaders: "2.150",
      readersBreakdown: "Lượt vào: 142 • Mượn: 68",
      copyStatus: [4935, 695, 50],
      categoryCounts: [485, 310, 215, 140, 90],
    },
    week: {
      totalBooks: "1.240",
      booksTrend: "+24 tựa sách mới tuần qua",
      totalCopies: "5.680",
      availCopies: "4.920 rảnh",
      borrowedCopies: "710 mượn",
      damagedCopies: "50 mất/hỏng",
      activeLoans: "342",
      overdueLoans: "18 phiếu quá hạn cần xử lý",
      activeReaders: "2.150",
      readersBreakdown: "Sinh viên: 1.940 • GV: 210",
      copyStatus: [4920, 710, 50],
      categoryCounts: [485, 310, 215, 140, 90],
    },
    month: {
      totalBooks: "1.240",
      booksTrend: "+86 tựa sách mới tháng này",
      totalCopies: "5.680",
      availCopies: "4.860 rảnh",
      borrowedCopies: "770 mượn",
      damagedCopies: "50 mất/hỏng",
      activeLoans: "415",
      overdueLoans: "24 phiếu quá hạn",
      activeReaders: "2.150",
      readersBreakdown: "Mượn tích lũy: 1.198 lượt",
      copyStatus: [4860, 770, 50],
      categoryCounts: [485, 310, 215, 140, 90],
    },
  };

  // Toast notification
  function showToast(message, type = "success") {
    const box = document.getElementById("toast-box");
    if (!box) return;

    const item = document.createElement("div");
    item.className = `toast-item ${type === "error" ? "error" : type === "warning" ? "warning" : ""}`;

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.style.fontSize = "18px";
    icon.textContent = type === "error" ? "error" : type === "warning" ? "warning" : "check_circle";

    const text = document.createElement("span");
    text.textContent = message;

    item.appendChild(icon);
    item.appendChild(text);
    box.appendChild(item);

    setTimeout(() => {
      item.style.opacity = "0";
      item.style.transform = "translateY(12px)";
      item.style.transition = "all 0.25s ease";
      setTimeout(() => item.remove(), 250);
    }, 3200);
  }

  // Khởi tạo các biểu đồ Chart.js
  function initCharts() {
    // 1. Doughnut Chart: Tình trạng bản sao
    const ctxCopy = document.getElementById("copyStatusChart");
    if (ctxCopy && !copyStatusChartInstance && typeof Chart !== "undefined") {
      copyStatusChartInstance = new Chart(ctxCopy, {
        type: "doughnut",
        data: {
          labels: ["Sẵn sàng phục vụ", "Đang mượn", "Hư hỏng / Mất"],
          datasets: [
            {
              data: [4920, 710, 50],
              backgroundColor: ["#1B4332", "#2D6A4F", "#BA1A1A"],
              hoverBackgroundColor: ["#24553F", "#398261", "#D42222"],
              borderWidth: 2,
              borderColor: "#FFFFFF",
              cutout: "75%",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const total = 5680;
                  const value = context.raw;
                  const percentage = ((value / total) * 100).toFixed(1);
                  return ` ${context.label}: ${value.toLocaleString()} cuốn (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    }

    // 2. Horizontal Bar Chart: Thống kê sách theo thể loại / chuyên ngành
    const ctxCat = document.getElementById("categoryBarChart");
    if (ctxCat && !categoryBarChartInstance && typeof Chart !== "undefined") {
      categoryBarChartInstance = new Chart(ctxCat, {
        type: "bar",
        data: {
          labels: ["CNTT", "Kinh tế & QTKD", "Ngoại ngữ", "Kỹ năng mềm", "Khoa học cơ bản"],
          datasets: [
            {
              label: "Số đầu sách",
              data: [485, 310, 215, 140, 90],
              backgroundColor: ["#1B4332", "#2D6A4F", "#52796F", "#84A98C", "#B5C99A"],
              borderRadius: 6,
              barThickness: 16,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return ` Số lượng: ${context.raw} đầu sách`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: "#E6E2D8", drawBorder: false },
              ticks: { font: { family: "JetBrains Mono", size: 10 }, color: "#515F74" },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: "Plus Jakarta Sans", size: 11, weight: "500" }, color: "#1B1C1A" },
            },
          },
        },
      });
    }
  }

  // Chuyển đổi giữa 4 trạng thái hệ thống
  function switchState(targetId) {
    const states = ["state-success", "state-loading", "state-empty", "state-error"];
    states.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        if (id === targetId) {
          el.classList.remove("hidden");
        } else {
          el.classList.add("hidden");
        }
      }
    });

    // Cập nhật giao diện nút bấm
    document.querySelectorAll(".state-btn").forEach((btn) => {
      if (btn.getAttribute("data-target") === targetId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Xử lý huy hiệu mất kết nối và nút xuất báo cáo
    const badge = document.getElementById("connection-status-badge");
    const exportBtn = document.getElementById("exportBtn");

    if (targetId === "state-error") {
      if (badge) badge.classList.remove("hidden");
      if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.style.opacity = "0.5";
        exportBtn.style.cursor = "not-allowed";
        exportBtn.title = "Cần có ít nhất 1 giao dịch để xuất báo cáo";
      }
      showToast(
        "Không thể kết nối máy chủ! Mã lỗi: HTTP 503 Gateway Timeout. Vui lòng kiểm tra lại mạng.",
        "error"
      );
    } else {
      if (badge) badge.classList.add("hidden");
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.style.opacity = "1";
        exportBtn.style.cursor = "pointer";
        exportBtn.title = "Xuất báo cáo thống kê";
      }
    }

    // Kích hoạt vẽ lại biểu đồ khi quay lại Thành công
    if (targetId === "state-success") {
      setTimeout(() => {
        if (copyStatusChartInstance) copyStatusChartInstance.resize();
        if (categoryBarChartInstance) categoryBarChartInstance.resize();
      }, 60);
    }
  }

  // Thử kết nối lại máy chủ khi gặp lỗi
  function retryConnection() {
    switchState("state-loading");
    showToast("Đang kiểm tra kết nối với máy chủ FastAPI KS25...", "warning");
    setTimeout(() => {
      switchState("state-success");
      showToast("Đã khôi phục kết nối thành công!");
    }, 1000);
  }

  // Cập nhật số liệu theo khoảng thời gian
  function setTimeFilter(filterKey) {
    const data = TIME_DATA[filterKey] || TIME_DATA.week;

    const totalBooksEl = document.getElementById("stat-total-books");
    const booksTrendEl = document.getElementById("stat-books-trend");
    const totalCopiesEl = document.getElementById("stat-total-copies");
    const availCopiesEl = document.getElementById("stat-avail-copies");
    const borrowedCopiesEl = document.getElementById("stat-borrowed-copies");
    const damagedCopiesEl = document.getElementById("stat-damaged-copies");
    const activeLoansEl = document.getElementById("stat-active-loans");
    const overdueLoansEl = document.getElementById("stat-overdue-loans");
    const activeReadersEl = document.getElementById("stat-active-readers");
    const readersBreakdownEl = document.getElementById("stat-readers-breakdown");

    if (totalBooksEl) totalBooksEl.textContent = data.totalBooks;
    if (booksTrendEl) booksTrendEl.textContent = data.booksTrend;
    if (totalCopiesEl) totalCopiesEl.textContent = data.totalCopies;
    if (availCopiesEl) availCopiesEl.textContent = data.availCopies;
    if (borrowedCopiesEl) borrowedCopiesEl.textContent = data.borrowedCopies;
    if (damagedCopiesEl) damagedCopiesEl.textContent = data.damagedCopies;
    if (activeLoansEl) activeLoansEl.textContent = data.activeLoans;
    if (overdueLoansEl) overdueLoansEl.textContent = data.overdueLoans;
    if (activeReadersEl) activeReadersEl.textContent = data.activeReaders;
    if (readersBreakdownEl) readersBreakdownEl.textContent = data.readersBreakdown;

    // Cập nhật dữ liệu biểu đồ
    if (copyStatusChartInstance && data.copyStatus) {
      copyStatusChartInstance.data.datasets[0].data = data.copyStatus;
      copyStatusChartInstance.update();
    }
    if (categoryBarChartInstance && data.categoryCounts) {
      categoryBarChartInstance.data.datasets[0].data = data.categoryCounts;
      categoryBarChartInstance.update();
    }

    // Đổi active button
    document.querySelectorAll(".time-btn").forEach((btn) => {
      if (btn.getAttribute("data-time") === filterKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const labelMap = { today: "Hôm nay", week: "Tuần này", month: "Tháng này" };
    showToast(`Đã đồng bộ số liệu thống kê: ${labelMap[filterKey] || filterKey}`);
  }

  // Tải dữ liệu thực tế từ API Backend nếu có kết nối
  async function syncLiveDataFromApi() {
    if (typeof api === "undefined") return;

    try {
      // 1. Thống kê đầu sách
      const bookRes = await api.get("/books/search", { page: 1, page_size: 1 });
      if (bookRes && typeof bookRes.total === "number" && bookRes.total > 0) {
        const totalBooksEl = document.getElementById("stat-total-books");
        if (totalBooksEl) totalBooksEl.textContent = Number(bookRes.total).toLocaleString("vi-VN");
      }

      // 2. Thống kê bản sao
      const copiesRes = await api.get("/book_copies");
      if (Array.isArray(copiesRes) && copiesRes.length > 0) {
        const total = copiesRes.length;
        const avail = copiesRes.filter((c) => c.status === "AVAILABLE").length;
        const borrowed = copiesRes.filter((c) => c.status === "BORROWED").length;
        const damaged = copiesRes.filter((c) => ["LOST", "DAMAGED", "MAINTENANCE"].includes(c.status)).length;

        const totalCopiesEl = document.getElementById("stat-total-copies");
        const availCopiesEl = document.getElementById("stat-avail-copies");
        const borrowedCopiesEl = document.getElementById("stat-borrowed-copies");
        const damagedCopiesEl = document.getElementById("stat-damaged-copies");

        if (totalCopiesEl) totalCopiesEl.textContent = total.toLocaleString("vi-VN");
        if (availCopiesEl) availCopiesEl.textContent = `${avail.toLocaleString("vi-VN")} rảnh`;
        if (borrowedCopiesEl) borrowedCopiesEl.textContent = `${borrowed.toLocaleString("vi-VN")} mượn`;
        if (damagedCopiesEl) damagedCopiesEl.textContent = `${damaged.toLocaleString("vi-VN")} mất/hỏng`;

        if (copyStatusChartInstance) {
          copyStatusChartInstance.data.datasets[0].data = [avail, borrowed, damaged];
          copyStatusChartInstance.update();
        }
      }
    } catch {
      // Backend offline hoặc chưa có dữ liệu -> dùng mock data mặc định
    }
  }

  // Khởi tạo và lắng nghe các sự kiện
  function init() {
    initCharts();
    syncLiveDataFromApi();

    // 1. Chuyển đổi trạng thái hệ thống
    document.querySelectorAll(".state-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        switchState(target);
      });
    });

    // 2. Chuyển đổi thời gian lọc
    document.querySelectorAll(".time-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const timeKey = btn.getAttribute("data-time");
        setTimeFilter(timeKey);
      });
    });

    // 3. Dropdown xuất báo cáo
    const exportBtn = document.getElementById("exportBtn");
    const exportMenu = document.getElementById("exportMenu");
    if (exportBtn && exportMenu) {
      exportBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle("show");
      });

      document.addEventListener("click", (e) => {
        if (!exportMenu.contains(e.target) && !exportBtn.contains(e.target)) {
          exportMenu.classList.remove("show");
        }
      });

      exportMenu.querySelectorAll(".export-menu-item").forEach((item) => {
        item.addEventListener("click", () => {
          const type = item.getAttribute("data-export");
          exportMenu.classList.remove("show");
          if (type === "print") {
            window.print();
          } else if (type === "pdf") {
            showToast("Đang kết xuất báo cáo thống kê định dạng PDF...");
            setTimeout(() => showToast("Đã tải xuống file: Bao_cao_thong_ke_KS25.pdf"), 1000);
          } else if (type === "xlsx") {
            showToast("Đang trích xuất dữ liệu bảng tính Excel (.xlsx)...");
            setTimeout(() => showToast("Đã tải xuống file: So_lieu_tong_quan_KS25.xlsx"), 1000);
          }
        });
      });
    }

    // 4. Nút gửi email nhắc nhở quá hạn
    const btnRemind = document.getElementById("btnRemindOverdue");
    if (btnRemind) {
      btnRemind.addEventListener("click", () => {
        btnRemind.disabled = true;
        btnRemind.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s infinite linear; font-size: 16px;">sync</span> Đang gửi...`;
        setTimeout(() => {
          showToast("Đã gửi email nhắc nhở tự động đến 18 độc giả có phiếu mượn quá hạn!");
          btnRemind.disabled = false;
          btnRemind.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">outgoing_mail</span><span>Gửi email nhắc nhở hàng loạt</span>`;
        }, 1200);
      });
    }

    // 5. Tìm kiếm nhanh trên topbar
    const topbarSearch = document.getElementById("topbar-global-search");
    if (topbarSearch) {
      topbarSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && topbarSearch.value.trim()) {
          const kw = encodeURIComponent(topbarSearch.value.trim());
          window.location.href = `books.html?q=${kw}`;
        }
      });
    }
  }

  // Export ra window để các thẻ onclick gọi được nếu cần
  window.dashboardApp = {
    switchState,
    setTimeFilter,
    showToast,
    retryConnection,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
