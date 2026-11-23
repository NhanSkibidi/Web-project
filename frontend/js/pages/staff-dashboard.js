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
  let borrowingTrendChartInstance = null;

  // Trạng thái bộ lọc thống kê (Task T3CFF62)
  let currentPeriod = "month";
  let currentGroupBy = "day";
  let currentStartDate = "";
  let currentEndDate = "";
  let lastDashboardPayload = null;

  // Biến lưu trữ dữ liệu Quá hạn & Sắp đến hạn (Task T3CFF48)
  let currentOverdueSubtab = "overdue"; // 'overdue' hoặc 'duesoon'
  let cachedOverdueItems = [];
  let cachedDueSoonItems = [];

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
                  const total = context.dataset.data.reduce((sum, n) => sum + Number(n || 0), 0) || 1;
                  const value = Number(context.raw || 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return ` ${context.label}: ${value.toLocaleString("vi-VN")} cuốn (${percentage}%)`;
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
    // 3. Combo Chart (Task T3CFF62): Lượt mượn, Lượt trả & Tiền phạt đã thu theo ngày/tháng
    const ctxTrend = document.getElementById("borrowingTrendChart");
    if (ctxTrend && !borrowingTrendChartInstance && typeof Chart !== "undefined") {
      borrowingTrendChartInstance = new Chart(ctxTrend, {
        type: "bar",
        data: {
          labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
          datasets: [
            {
              type: "line",
              label: "Lượt mượn",
              data: [42, 55, 48, 63, 71, 38, 25],
              borderColor: "#1B4332",
              backgroundColor: "rgba(27, 67, 50, 0.12)",
              borderWidth: 2.5,
              tension: 0.35,
              fill: true,
              pointRadius: 3.5,
              pointBackgroundColor: "#1B4332",
              yAxisID: "y",
            },
            {
              type: "bar",
              label: "Lượt trả",
              data: [35, 44, 41, 52, 60, 32, 20],
              backgroundColor: "rgba(82, 121, 111, 0.45)",
              borderRadius: 5,
              maxBarThickness: 24,
              yAxisID: "y",
            },
            {
              type: "line",
              label: "Tiền phạt đã thu (VNĐ)",
              data: [40000, 60000, 20000, 120000, 80000, 60000, 40000],
              borderColor: "#D97706",
              backgroundColor: "rgba(217, 119, 6, 0.15)",
              borderWidth: 2,
              borderDash: [5, 4],
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: "#D97706",
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: true,
              position: "top",
              align: "end",
              labels: { boxWidth: 12, font: { family: "Plus Jakarta Sans", size: 12 } },
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  if (ctx.dataset.yAxisID === "y1") {
                    return ` ${ctx.dataset.label}: ${Number(ctx.raw || 0).toLocaleString("vi-VN")} đ`;
                  }
                  return ` ${ctx.dataset.label}: ${ctx.raw} lượt`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: "JetBrains Mono", size: 11 }, color: "#515F74" },
            },
            y: {
              type: "linear",
              position: "left",
              beginAtZero: true,
              title: { display: true, text: "Lượt mượn / trả", font: { size: 11 } },
              grid: { color: "#E6E2D8", drawBorder: false },
              ticks: { precision: 0, font: { family: "JetBrains Mono", size: 11 } },
            },
            y1: {
              type: "linear",
              position: "right",
              beginAtZero: true,
              title: { display: true, text: "Tiền phạt (VNĐ)", font: { size: 11 }, color: "#B45309" },
              grid: { drawOnChartArea: false },
              ticks: {
                font: { family: "JetBrains Mono", size: 10 },
                color: "#B45309",
                callback: (val) => `${Number(val).toLocaleString("vi-VN")}đ`,
              },
            },
          },
        },
      });
    }
  }
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
        if (borrowingTrendChartInstance) borrowingTrendChartInstance.resize();
      }, 60);
    }
  }

  // Thử kết nối lại máy chủ khi gặp lỗi
  async function retryConnection() {
    switchState("state-loading");
    showToast("Đang kiểm tra kết nối với máy chủ FastAPI KS25...", "warning");
    const ok = await loadDashboardStatistics(false);
    if (ok) {
      await syncOverdueData();
      switchState("state-success");
      showToast("Đã khôi phục kết nối thành công!");
    } else {
      switchState("state-error");
      showToast("Vẫn chưa thể kết nối tới máy chủ thống kê.", "error");
    }
  }

  // Cập nhật số liệu theo khoảng thời gian (Task T3CFF62)
  function setTimeFilter(filterKey) {
    currentPeriod = filterKey;
    currentStartDate = "";
    currentEndDate = "";

    // Tự động chuyển sang theo tháng khi chọn Năm nay
    if (filterKey === "year") {
      currentGroupBy = "month";
      document.querySelectorAll(".group-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-group") === "month");
      });
    }

    // Đổi active button
    document.querySelectorAll(".time-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-time") === filterKey);
    });

    loadDashboardStatistics(true);
  }

  // ── TASK T3CFF62: ĐỒNG BỘ DASHBOARD THỐNG KÊ TỪ /api/statistics/dashboard ──
  async function loadDashboardStatistics(showNotify = false) {
    if (typeof api === "undefined") return false;

    const params = {
      group_by: currentGroupBy,
    };
    if (currentStartDate && currentEndDate) {
      params.start_date = currentStartDate;
      params.end_date = currentEndDate;
      params.period = "custom";
    } else {
      params.period = currentPeriod;
    }

    try {
      const res = await api.get("/statistics/dashboard", params);
      if (!res || !res.summary) return false;
      lastDashboardPayload = res;

      const s = res.summary;

      // Đồng bộ input date picker với khoảng ngày thực tế server trả về
      const startInput = document.getElementById("filter-start-date");
      const endInput = document.getElementById("filter-end-date");
      if (startInput && res.start_date) startInput.value = res.start_date;
      if (endInput && res.end_date) endInput.value = res.end_date;

      const rangeBadge = document.getElementById("trend-range-badge");
      if (rangeBadge && res.start_date && res.end_date) {
        const fmtD = (iso) => iso.split("-").reverse().join("/");
        rangeBadge.textContent = `${fmtD(res.start_date)} – ${fmtD(res.end_date)}`;
      }

      // 1. Cập nhật 5 KPI Cards
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setTxt("stat-total-books", Number(s.total_books).toLocaleString("vi-VN"));
      setTxt("stat-books-trend", `Tổng ${Number(s.total_copies).toLocaleString("vi-VN")} bản sao`);
      setTxt("stat-total-copies", Number(s.total_copies).toLocaleString("vi-VN"));
      setTxt("stat-avail-copies", `${Number(s.available_copies).toLocaleString("vi-VN")} rảnh`);
      setTxt("stat-borrowed-copies", `${Number(s.borrowed_copies).toLocaleString("vi-VN")} mượn`);
      setTxt("stat-damaged-copies", `${Number(s.damaged_or_lost_copies).toLocaleString("vi-VN")} mất/hỏng`);
      setTxt("stat-active-loans", Number(s.loans_in_period).toLocaleString("vi-VN"));
      setTxt(
        "stat-overdue-loans",
        `${Number(s.overdue_books_count).toLocaleString("vi-VN")} sách quá hạn (${Number(s.overdue_loans_count || 0)} phiếu)`
      );
      setTxt("stat-fines-collected", `${Number(s.collected_fines_amount || 0).toLocaleString("vi-VN")} đ`);
      setTxt(
        "stat-fines-meta",
        `${s.collected_fines_count || 0} biên lai • Nợ: ${Number(s.unpaid_fines_amount || 0).toLocaleString("vi-VN")} đ`
      );
      setTxt("stat-active-readers", Number(s.active_readers).toLocaleString("vi-VN"));
      setTxt("stat-readers-breakdown", `Đang giữ ${s.active_loans} phiếu mượn`);

      // 2. Cập nhật Biểu đồ Doughnut: Tình trạng bản sao + số liệu chi tiết bên cạnh
      if (copyStatusChartInstance) {
        copyStatusChartInstance.data.datasets[0].data = [
          s.available_copies,
          s.borrowed_copies,
          s.damaged_or_lost_copies,
        ];
        copyStatusChartInstance.update();
      }
      const totalC = Number(s.total_copies) || 0;
      const pctOf = (v) => (totalC > 0 ? ((v / totalC) * 100).toFixed(1) : "0.0");
      setTxt("copy-sub-text", `Phân bổ trạng thái ${totalC.toLocaleString("vi-VN")} cuốn sách`);
      setTxt("copy-total-badge", `TỔNG: ${totalC.toLocaleString("vi-VN")}`);
      setTxt("copy-avail-percent", `${pctOf(s.available_copies)}%`);
      setTxt("copy-avail-val", Number(s.available_copies).toLocaleString("vi-VN"));
      setTxt("copy-avail-pct", `(${pctOf(s.available_copies)}%)`);
      setTxt("copy-borrowed-val", Number(s.borrowed_copies).toLocaleString("vi-VN"));
      setTxt("copy-borrowed-pct", `(${pctOf(s.borrowed_copies)}%)`);
      setTxt("copy-damaged-val", Number(s.damaged_or_lost_copies).toLocaleString("vi-VN"));
      setTxt("copy-damaged-pct", `(${pctOf(s.damaged_or_lost_copies)}%)`);

      // 3. Cập nhật Biểu đồ Lượt mượn, Lượt trả & Tiền phạt theo ngày/tháng
      if (borrowingTrendChartInstance && Array.isArray(res.borrowing_trend)) {
        borrowingTrendChartInstance.data.labels = res.borrowing_trend.map((p) => p.label);
        borrowingTrendChartInstance.data.datasets[0].data = res.borrowing_trend.map((p) => p.borrow_count);
        borrowingTrendChartInstance.data.datasets[1].data = res.borrowing_trend.map((p) => p.return_count);
        borrowingTrendChartInstance.data.datasets[2].data = res.borrowing_trend.map((p) => p.fine_collected);
        borrowingTrendChartInstance.update();
      }

      // 4. Cập nhật Biểu đồ & Bảng Thể loại phổ biến
      if (Array.isArray(res.popular_categories) && res.popular_categories.length > 0) {
        const catPalette = ["#1B4332", "#2D6A4F", "#52796F", "#84A98C", "#B5C99A", "#CAD2C5"];
        if (categoryBarChartInstance) {
          categoryBarChartInstance.data.labels = res.popular_categories.map((c) => c.category_name);
          categoryBarChartInstance.data.datasets[0].label = "Lượt mượn";
          categoryBarChartInstance.data.datasets[0].data = res.popular_categories.map((c) => c.borrow_count || c.book_count);
          categoryBarChartInstance.data.datasets[0].backgroundColor = res.popular_categories.map(
            (_, idx) => catPalette[idx % catPalette.length]
          );
          categoryBarChartInstance.update();
        }

        const catTbody = document.getElementById("category-table-body");
        if (catTbody) {
          catTbody.innerHTML = res.popular_categories
            .map((c, idx) => {
              const color = catPalette[idx % catPalette.length];
              return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="dot-color" style="background: ${color};"></span>
                      <span>${escapeHtml(c.category_name)}</span>
                    </div>
                  </td>
                  <td style="text-align: center;" class="font-mono"><strong>${c.book_count}</strong></td>
                  <td style="text-align: center;" class="font-mono">${c.percentage}%</td>
                  <td style="text-align: right; color: var(--color-success); font-weight: 600;" class="font-mono">${c.borrow_count} lượt</td>
                </tr>
              `;
            })
            .join("");
        }
      } else if (Array.isArray(res.popular_categories)) {
        if (categoryBarChartInstance) {
          categoryBarChartInstance.data.labels = [];
          categoryBarChartInstance.data.datasets[0].data = [];
          categoryBarChartInstance.update();
        }
        const catTbody = document.getElementById("category-table-body");
        if (catTbody) {
          catTbody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">
                Chưa có dữ liệu thể loại trong kỳ này.
              </td>
            </tr>
          `;
        }
      }

      // 5. Cập nhật Bảng Top Sách mượn nhiều nhất
      const topTbody = document.getElementById("top-books-tbody");
      const topFooter = document.getElementById("top-books-footer");
      if (topTbody && Array.isArray(res.top_borrowed_books)) {
        if (res.top_borrowed_books.length === 0) {
          topTbody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 24px; color: #64748b;">
                Chưa có lượt mượn sách nào trong khoảng thời gian đã chọn.
              </td>
            </tr>
          `;
        } else {
          const maxBorrow = Math.max(...res.top_borrowed_books.map((b) => b.borrow_count), 1);
          topTbody.innerHTML = res.top_borrowed_books
            .map((b) => {
              const rankCls = b.rank <= 3 ? `rank-${b.rank}` : "";
              const pct = Math.round((b.borrow_count / maxBorrow) * 100);
              const availCls = b.available_copies <= 1 ? "red" : "blue";
              return `
                <tr>
                  <td style="text-align: center;"><span class="rank-pill ${rankCls}">#${b.rank}</span></td>
                  <td>
                    <strong title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</strong>
                    <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(b.category_name)} • ISBN: ${escapeHtml(b.isbn)}</div>
                  </td>
                  <td style="text-align: center;">
                    <div class="borrow-progress-wrap">
                      <div class="borrow-progress-bar"><div class="borrow-progress-fill" style="width:${pct}%"></div></div>
                      <strong class="font-mono">${b.borrow_count}</strong>
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <span class="badge-count-pill ${availCls}">${b.available_copies} / ${b.total_copies}</span>
                  </td>
                </tr>
              `;
            })
            .join("");
        }
        if (topFooter) {
          topFooter.textContent = `Top ${res.top_borrowed_books.length} đầu sách mượn nhiều nhất trong kỳ`;
        }
      }

      if (showNotify) {
        const labelMap = { today: "Hôm nay", week: "Tuần này", month: "Tháng này", year: "Năm nay", custom: "Khoảng ngày tùy chọn" };
        showToast(`Đã đồng bộ số liệu thống kê: ${labelMap[res.period] || res.period}`);
      }
      return true;
    } catch (err) {
      if (err && (err.status === 401 || err.status === 403)) {
        showToast(err.message || "Phiên đăng nhập hết hạn hoặc bạn không có quyền xem thống kê.", "error");
        return false;
      }
      if (showNotify || err?.status === 0) {
        showToast(err?.message || "Không thể tải dữ liệu thống kê từ máy chủ.", "error");
      }
      return false;
    }
  }

  // Xuất file CSV (mở trực tiếp bằng Excel) từ dữ liệu thống kê hiện tại
  function exportStatisticsCsv() {
    const rows = [["Ngày/Tháng", "Lượt mượn", "Lượt trả", "Tiền phạt đã thu (VNĐ)"]];
    if (lastDashboardPayload && Array.isArray(lastDashboardPayload.borrowing_trend)) {
      lastDashboardPayload.borrowing_trend.forEach((p) => {
        rows.push([p.label, p.borrow_count, p.return_count, p.fine_collected]);
      });
    } else if (borrowingTrendChartInstance) {
      const labels = borrowingTrendChartInstance.data.labels || [];
      const b = borrowingTrendChartInstance.data.datasets[0].data || [];
      const r = borrowingTrendChartInstance.data.datasets[1].data || [];
      const f = borrowingTrendChartInstance.data.datasets[2].data || [];
      labels.forEach((lbl, i) => rows.push([lbl, b[i] || 0, r[i] || 0, f[i] || 0]));
    }
    const csvContent = "\uFEFF" + rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Thong_ke_thu_vien_KS25_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Đã tải xuống báo cáo thống kê (.csv mở bằng Excel)!");
  }

  // Tải dữ liệu thực tế từ API Backend nếu có kết nối
  async function syncLiveDataFromApi() {
    await Promise.allSettled([loadDashboardStatistics(false), syncOverdueData()]);
  }

  // ── TASK T3CFF48: XỬ LÝ DỮ LIỆU QUÁ HẠN & SẮP ĐẾN HẠN ─────────────────

  async function syncOverdueData() {
    try {
      const [overdueRes, dueSoonRes] = await Promise.allSettled([
        api.get("/loans/overdue"),
        api.get("/loans/due-soon?days=2"),
      ]);

      if (overdueRes.status === "fulfilled" && overdueRes.value) {
        cachedOverdueItems = overdueRes.value.items || [];
      }

      if (dueSoonRes.status === "fulfilled" && dueSoonRes.value) {
        cachedDueSoonItems = dueSoonRes.value.items || [];
      }

      renderOverdueTable();
    } catch (e) {
      console.warn("Không thể tải danh sách quá hạn từ API, giữ dữ liệu mặc định:", e);
    }
  }

  function renderOverdueTable() {
    const tbody = document.getElementById("overdue-table-body");
    const summaryEl = document.getElementById("overdue-footer-summary");
    const titleEl = document.getElementById("overdue-card-title");
    const subEl = document.getElementById("overdue-card-sub");
    const tabOverdue = document.getElementById("tabOverdue");
    const tabDueSoon = document.getElementById("tabDueSoon");

    if (!tbody) return;

    if (currentOverdueSubtab === "overdue") {
      if (titleEl) titleEl.textContent = "Phiếu mượn quá hạn";
      if (subEl) subEl.textContent = "Cần liên hệ nhắc nhở hoặc chuyển xử lý thu tiền phạt";
      if (tabOverdue) {
        tabOverdue.className = "badge-count-pill red";
        tabOverdue.style.background = "#FEE2E2";
        tabOverdue.style.color = "#DC2626";
      }
      if (tabDueSoon) {
        tabDueSoon.className = "badge-count-pill";
        tabDueSoon.style.background = "#F1F5F9";
        tabDueSoon.style.color = "#64748B";
      }

      const items = cachedOverdueItems;
      if (summaryEl) {
        summaryEl.textContent = `Tổng cộng: ${items.length} phiếu đang quá hạn`;
      }

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">
              <span class="material-symbols-outlined" style="font-size: 28px; color: #16a34a; vertical-align: middle;">check_circle</span>
              <span style="margin-left: 8px;">Hiện tại không có phiếu mượn nào bị quá hạn!</span>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = items
        .map((item) => {
          const fineFormatted = Number(item.estimated_fine || 0).toLocaleString("vi-VN");
          const fineUrl = `fines.html?loan_code=${encodeURIComponent(item.loan_code)}&reader=${encodeURIComponent(item.reader_name)}`;
          const remindedBadge = item.reminded_count > 0 
            ? `<div style="font-size: 10px; color: #16a34a; margin-top: 2px;">✓ Đã nhắc ${item.reminded_count} lần</div>` 
            : "";

          return `
            <tr>
              <td class="font-mono" style="font-weight: 700; color: var(--color-brand);">
                ${escapeHtml(item.student_id || item.card_code || item.user_id)}
              </td>
              <td>
                <strong>${escapeHtml(item.reader_name)}</strong>
                <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(item.reader_email || "")}</div>
              </td>
              <td>
                <div style="font-weight: 600; color: var(--color-text-primary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.book_title)}">
                  ${escapeHtml(item.book_title)}
                </div>
                <div style="font-size: 11px; color: var(--color-text-muted);">#${escapeHtml(item.loan_code)} • Bản: ${escapeHtml(item.copy_code || "—")}</div>
              </td>
              <td style="text-align: center;">
                <span class="badge-count-pill red">${item.days_overdue} ngày trễ</span>
                <div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-top: 2px;">Phạt: ${fineFormatted} đ</div>
                ${remindedBadge}
              </td>
              <td style="text-align: right;">
                <button type="button" class="btn-action-remind" data-loan="${item.loan_id}" data-name="${escapeHtml(item.reader_name)}" style="border:none;background:#fee2e2;color:#dc2626;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;margin-right:4px;" title="Gửi nhắc nhở in-app cho độc giả">
                  Nhắc nhở
                </button>
                <a href="${fineUrl}" style="display:inline-block;border:none;background:#e2e8f0;color:#334155;padding:4px 8px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;" title="Chuyển sang thu phạt">
                  Thu phạt
                </a>
              </td>
            </tr>
          `;
        })
        .join("");
    } else {
      // Tab: Sắp đến hạn
      if (titleEl) titleEl.textContent = "Phiếu mượn sắp đến hạn (trong 2 ngày)";
      if (subEl) subEl.textContent = "Độc giả có thể tự gia hạn trực tuyến thêm 7 ngày hoặc chuẩn bị hoàn trả";
      if (tabOverdue) {
        tabOverdue.className = "badge-count-pill";
        tabOverdue.style.background = "#F1F5F9";
        tabOverdue.style.color = "#64748B";
      }
      if (tabDueSoon) {
        tabDueSoon.className = "badge-count-pill";
        tabDueSoon.style.background = "#FEF3C7";
        tabDueSoon.style.color = "#D97706";
      }

      const items = cachedDueSoonItems;
      if (summaryEl) {
        summaryEl.textContent = `Tổng cộng: ${items.length} phiếu sắp đến hạn`;
      }

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">
              <span class="material-symbols-outlined" style="font-size: 28px; color: #64748b; vertical-align: middle;">schedule</span>
              <span style="margin-left: 8px;">Không có phiếu mượn nào sắp hết hạn trong 2 ngày tới.</span>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = items
        .map((item) => {
          return `
            <tr>
              <td class="font-mono" style="font-weight: 700; color: var(--color-brand);">
                ${escapeHtml(item.student_id || item.card_code || item.user_id)}
              </td>
              <td>
                <strong>${escapeHtml(item.reader_name)}</strong>
                <div style="font-size: 11px; color: var(--color-text-muted);">${escapeHtml(item.reader_email || "")}</div>
              </td>
              <td>
                <div style="font-weight: 600; color: var(--color-text-primary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.book_title)}">
                  ${escapeHtml(item.book_title)}
                </div>
                <div style="font-size: 11px; color: var(--color-text-muted);">#${escapeHtml(item.loan_code)} • Bản: ${escapeHtml(item.copy_code || "—")}</div>
              </td>
              <td style="text-align: center;">
                <span class="badge-count-pill" style="background:#FEF3C7;color:#D97706;">${escapeHtml(item.status_label)}</span>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Hạn: ${item.due_date}</div>
              </td>
              <td style="text-align: right;">
                <button type="button" class="btn-action-remind" data-loan="${item.loan_id}" data-name="${escapeHtml(item.reader_name)}" style="border:none;background:#fef3c7;color:#b45309;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;" title="Gửi nhắc nhở in-app sớm">
                  Nhắc hạn
                </button>
              </td>
            </tr>
          `;
        })
        .join("");
    }

    // Gắn sự kiện gửi nhắc nhở đơn lẻ
    tbody.querySelectorAll(".btn-action-remind").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const loanId = btn.getAttribute("data-loan");
        const readerName = btn.getAttribute("data-name");
        const originalText = btn.textContent.trim();
        btn.disabled = true;
        btn.textContent = "Đang gửi...";

        try {
          const msg =
            currentOverdueSubtab === "duesoon"
              ? "Thủ thư nhắc nhở: Sách bạn đang mượn sắp đến hạn trả, vui lòng chuẩn bị trả đúng hạn hoặc gia hạn online."
              : "Thủ thư nhắc nhở: Vui lòng lưu ý trả sách quá hạn để tránh phát sinh thêm phí phạt!";
          const res = await api.post(`/loans/${loanId}/remind`, { message: msg });
          showToast(res?.message || `Đã gửi thông báo nhắc nhở thành công cho ${readerName}!`);
          btn.textContent = "✓ Đã gửi";
          btn.style.background = "#dcfce7";
          btn.style.color = "#15803d";
          if (window.unilibNotifications && window.unilibNotifications.load) {
            window.unilibNotifications.load();
          }
        } catch (e) {
          btn.disabled = false;
          btn.textContent = originalText;
          showToast(`Gửi nhắc nhở thất bại: ${e?.message || "Lỗi kết nối máy chủ"}`, "error");
        }
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderStaffGuard(title, desc, ctaLabel, ctaHref) {
    const mainEl = document.querySelector(".dashboard-main-container");
    if (!mainEl) return;
    mainEl.innerHTML = `
      <div class="dashboard-card" style="max-width: 560px; margin: 56px auto; padding: 32px; text-align: center;">
        <div style="width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center;">
          <span class="material-symbols-outlined" style="font-size: 28px;">lock</span>
        </div>
        <h2 class="font-headline" style="margin: 0 0 8px; color: var(--color-brand);">${escapeHtml(title)}</h2>
        <p style="margin: 0 0 22px; color: var(--color-text-secondary); font-size: 14px;">${escapeHtml(desc)}</p>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          <a href="${ctaHref}" class="btn-export-primary" style="text-decoration: none;">${escapeHtml(ctaLabel)}</a>
          <a href="home.html" class="btn-export-primary" style="text-decoration: none; background: var(--color-surface); color: var(--color-brand); border: 1px solid var(--color-border);">Về Trang chủ</a>
        </div>
      </div>
    `;
  }

  async function refreshEmailStatusTooltip() {
    try {
      const st = await api.get("/emails/status");
      const modeText = st?.smtp_configured ? `SMTP Gmail (${st.smtp_user})` : "Dry-Run (ghi log server)";
      const btnDue = document.getElementById("btnEmailDueSoon");
      const btnOver = document.getElementById("btnRemindOverdue");
      if (btnDue) btnDue.title = `Gửi email nhắc hạn 2 ngày tới · Chế độ: ${modeText}`;
      if (btnOver) btnOver.title = `Gửi thông báo in-app & email quá hạn · Chế độ: ${modeText}`;
    } catch (_) {}
  }

  // Khởi tạo và lắng nghe các sự kiện
  function init() {
    const token = typeof auth !== "undefined" ? auth.getToken() : null;
    const staffUser = typeof auth !== "undefined" ? auth.getUser() : null;

    if (!token || !staffUser) {
      try { sessionStorage.setItem("redirect_after_login", window.location.href); } catch (_) {}
      renderStaffGuard(
        "Yêu cầu đăng nhập Thủ thư / Admin",
        "Trang Tổng quan & Thống kê Thư viện yêu cầu tài khoản Thủ thư (LIBRARIAN) hoặc Quản trị viên (ADMIN).",
        "Đăng nhập ngay →",
        "login.html#login"
      );
      return;
    }

    if (!["ADMIN", "LIBRARIAN"].includes(staffUser.role)) {
      renderStaffGuard(
        "Không có quyền truy cập (403)",
        `Tài khoản "${staffUser.full_name || staffUser.email}" (${staffUser.role}) không thuộc nhóm quản trị thư viện.`,
        "Về Cổng Độc giả",
        "home.html"
      );
      return;
    }

    const avatarEl = document.getElementById("staff-avatar");
    const nameEl = document.getElementById("staff-name");
    const roleEl = document.getElementById("staff-role");
    if (avatarEl) avatarEl.textContent = (staffUser.full_name || staffUser.email || "T").charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = staffUser.full_name || staffUser.email;
    if (roleEl) roleEl.textContent = staffUser.role === "ADMIN" ? "Quản trị viên" : "Thủ thư trực quầy";

    document.getElementById("btn-logout")?.addEventListener("click", () => {
      auth.clearSession();
      window.location.href = "login.html#login";
    });

    initCharts();
    syncLiveDataFromApi();
    refreshEmailStatusTooltip();

    // 1. Chuyển đổi trạng thái hệ thống
    document.querySelectorAll(".state-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        switchState(target);
      });
    });

    // 2. Chuyển đổi thời gian lọc nhanh
    document.querySelectorAll(".time-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const timeKey = btn.getAttribute("data-time");
        setTimeFilter(timeKey);
      });
    });

    // 2b. Lọc theo khoảng ngày tùy chỉnh (Từ ngày -> Đến ngày)
    const btnApplyRange = document.getElementById("btnApplyDateRange");
    if (btnApplyRange) {
      btnApplyRange.addEventListener("click", () => {
        const sVal = document.getElementById("filter-start-date")?.value || "";
        const eVal = document.getElementById("filter-end-date")?.value || "";
        if (!sVal || !eVal) {
          showToast("Vui lòng chọn đầy đủ Từ ngày và Đến ngày!", "warning");
          return;
        }
        if (sVal > eVal) {
          showToast("Ngày bắt đầu không được lớn hơn ngày kết thúc!", "error");
          return;
        }
        currentStartDate = sVal;
        currentEndDate = eVal;
        currentPeriod = "custom";
        document.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
        loadDashboardStatistics(true);
      });
    }

    // 2c. Chuyển đổi gom nhóm biểu đồ: Theo ngày / Theo tháng
    document.querySelectorAll(".group-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const g = btn.getAttribute("data-group");
        if (!g || g === currentGroupBy) return;
        currentGroupBy = g;
        document.querySelectorAll(".group-btn").forEach((b) => {
          b.classList.toggle("active", b.getAttribute("data-group") === g);
        });
        loadDashboardStatistics(true);
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
            window.print();
          } else if (type === "xlsx") {
            exportStatisticsCsv();
          }
        });
      });
    }

    // 4. Tab chuyển đổi Quá hạn / Sắp đến hạn
    const tabOverdue = document.getElementById("tabOverdue");
    const tabDueSoon = document.getElementById("tabDueSoon");
    if (tabOverdue && tabDueSoon) {
      tabOverdue.addEventListener("click", () => {
        currentOverdueSubtab = "overdue";
        renderOverdueTable();
      });
      tabDueSoon.addEventListener("click", () => {
        currentOverdueSubtab = "duesoon";
        renderOverdueTable();
      });
    }

    // 5. Nút gửi nhắc nhở quá hạn hàng loạt (in-app + email nền)
    const btnRemind = document.getElementById("btnRemindOverdue");
    if (btnRemind) {
      btnRemind.addEventListener("click", async () => {
        btnRemind.disabled = true;
        btnRemind.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s infinite linear; font-size: 16px;">sync</span> Đang gửi nhắc nhở...`;

        try {
          const res = await api.post("/loans/remind-all-overdue");
          const count = res?.sent_count ?? 0;
          const queued = res?.queued_emails ?? 0;
          showToast(
            queued > 0
              ? `Đã gửi ${count} nhắc nhở in-app và xếp hàng ${queued} email cảnh báo quá hạn!`
              : `Đã gửi thông báo in-app nhắc nhở đến ${count} phiếu quá hạn!`
          );
          if (window.unilibNotifications && window.unilibNotifications.load) {
            window.unilibNotifications.load();
          }
          await syncOverdueData();
        } catch (e) {
          showToast(`Gửi nhắc nhở hàng loạt thất bại: ${e?.message || "Lỗi máy chủ"}`, "error");
        } finally {
          btnRemind.disabled = false;
          btnRemind.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">outgoing_mail</span><span>Gửi thông báo nhắc nhở hàng loạt</span>`;
        }
      });
    }

    // 5b. Nút gửi Email nhắc hạn trả trong 2 ngày (Task Bonus T3D003D)
    const btnEmailDueSoon = document.getElementById("btnEmailDueSoon");
    if (btnEmailDueSoon) {
      btnEmailDueSoon.addEventListener("click", async () => {
        btnEmailDueSoon.disabled = true;
        btnEmailDueSoon.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s infinite linear; font-size: 16px;">sync</span> Đang xếp hàng email...`;
        try {
          const res = await api.post("/emails/remind-due-soon?days=2");
          showToast(
            `${res?.message || "Đã xếp hàng gửi email nhắc hạn"} (${res?.mode === "smtp" ? "SMTP Gmail" : "Dry-Run"})`
          );
        } catch (e) {
          showToast(`Không thể gửi email nhắc hạn: ${e?.message || "Lỗi máy chủ"}`, "error");
        } finally {
          btnEmailDueSoon.disabled = false;
          btnEmailDueSoon.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">mark_email_unread</span><span>Email nhắc sắp đến hạn</span>`;
        }
      });
    }

    // 6. Tìm kiếm nhanh trên topbar
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
