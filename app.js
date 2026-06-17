const STORAGE_KEYS = {
  categories: "instrumentPracticeLog_categories_v2",
  practices: "instrumentPracticeLog_practices_v2"
};

const defaultCategories = [
  { id: "cat-tcha5", name: "차이코프스키 5번", color: "#5B7CFA", createdAt: Date.now(), updatedAt: Date.now() },
  { id: "cat-bee9", name: "베토벤 9번", color: "#2F9E44", createdAt: Date.now(), updatedAt: Date.now() },
  { id: "cat-lesson", name: "레슨", color: "#F08C00", createdAt: Date.now(), updatedAt: Date.now() }
];

let categories = loadData(STORAGE_KEYS.categories, defaultCategories);
let practices = loadData(STORAGE_KEYS.practices, []);
let currentListStatus = "TODO";
let selectedPracticeId = null;
let pendingDelete = null;
let selectedRating = 0;

const $ = (id) => document.getElementById(id);

function loadData(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
  localStorage.setItem(STORAGE_KEYS.practices, JSON.stringify(practices));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCategory(categoryId) {
  return categories.find((category) => category.id === categoryId) || {
    id: "deleted",
    name: "삭제된 카테고리",
    color: "#999999"
  };
}

function openModal(id) {
  $(id).classList.remove("hidden");
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function setPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.querySelectorAll(".bottom-nav button").forEach((button) => button.classList.remove("active"));

  if (pageName === "list") {
    $("pageList").classList.add("active");
    $("navList").classList.add("active");
    $("pageTitle").textContent = "연습 리스트";
    $("pageDesc").textContent = "진행 예정 연습과 완료된 연습을 관리해요.";
    renderPracticeList();
  }

  if (pageName === "add") {
    $("pageAdd").classList.add("active");
    $("navAdd").classList.add("active");
    $("pageTitle").textContent = "연습 추가";
    $("pageDesc").textContent = "새로운 연습 목표를 등록해요.";
    resetPracticeForm();
    renderCategorySelects();
  }

  if (pageName === "settings") {
    $("pageSettings").classList.add("active");
    $("navSettings").classList.add("active");
    $("pageTitle").textContent = "설정";
    $("pageDesc").textContent = "카테고리와 통계를 관리해요.";
    renderCategoryPanel();
    renderStats();
  }
}

function setListStatus(status) {
  currentListStatus = status;
  $("todoTab").classList.toggle("active", status === "TODO");
  $("doneTab").classList.toggle("active", status === "DONE");
  renderPracticeList();
}

function renderCategorySelects() {
  const categoryOptions = categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");

  $("practiceCategory").innerHTML = categoryOptions || `<option value="">카테고리 없음</option>`;

  const previousFilter = $("categoryFilter").value || "ALL";
  $("categoryFilter").innerHTML = `<option value="ALL">전체</option>${categoryOptions}`;
  $("categoryFilter").value = categories.some((category) => category.id === previousFilter) ? previousFilter : "ALL";
}

function renderPracticeList() {
  renderCategorySelects();

  const filterCategoryId = $("categoryFilter").value || "ALL";
  let list = practices.filter((practice) => practice.status === currentListStatus);

  if (filterCategoryId !== "ALL") {
    list = list.filter((practice) => practice.categoryId === filterCategoryId);
  }

  list.sort((a, b) => {
    if (currentListStatus === "DONE") {
      return (b.completedAt || 0) - (a.completedAt || 0);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  if (list.length === 0) {
    $("practiceList").innerHTML = currentListStatus === "TODO"
      ? `<div class="empty">새 연습 목표를 추가해보세요!</div>`
      : `<div class="empty">아직 완료된 연습이 없어요.<br>오늘 연습 하나 완료해볼까요?</div>`;
    return;
  }

  $("practiceList").innerHTML = list.map((practice) => {
    const category = getCategory(practice.categoryId);

    if (currentListStatus === "TODO") {
      return `
        <button type="button" class="practice-card" data-practice-id="${practice.id}">
          <div class="card-top">
            <span class="tag"><span class="dot" style="background:${category.color}"></span>${escapeHtml(category.name)}</span>
          </div>
          <div class="card-title">${escapeHtml(practice.title)}</div>
          <div class="card-meta">${formatDate(practice.createdDate)} 등록</div>
        </button>
      `;
    }

    const ratingText = "★".repeat(practice.rating || 0) + "☆".repeat(5 - (practice.rating || 0));

    return `
      <button type="button" class="practice-card" data-practice-id="${practice.id}">
        <div class="card-top">
          <span class="tag"><span class="dot" style="background:${category.color}"></span>${escapeHtml(category.name)}</span>
          <span class="card-date">${formatDate(practice.completedDate)} 완료</span>
        </div>
        <div class="card-title">${escapeHtml(practice.title)}</div>
        <div class="card-meta">${practice.minutes || 0}분 · ${ratingText}</div>
      </button>
    `;
  }).join("");

  document.querySelectorAll("[data-practice-id]").forEach((card) => {
    card.addEventListener("click", () => openPracticeDetail(card.dataset.practiceId));
  });
}

function resetPracticeForm() {
  $("editingPracticeId").value = "";
  $("practiceFormTitle").textContent = "연습 신규 등록";
  $("practiceTitle").value = "";
  $("practiceGoal").value = "";
  $("savePracticeBtn").textContent = "등록";
  $("cancelPracticeEditBtn").classList.add("hidden");
}

function validatePracticeForm() {
  const categoryId = $("practiceCategory").value;
  const title = $("practiceTitle").value.trim();
  const goal = $("practiceGoal").value.trim();

  if (!categoryId) {
    alert("카테고리를 선택해주세요.");
    return null;
  }

  if (!title) {
    alert("연습 제목을 입력해주세요.");
    return null;
  }

  if (title.length > 100) {
    alert("연습 제목은 100자 이하로 입력해주세요.");
    return null;
  }

  if (!goal) {
    alert("연습 목표를 입력해주세요.");
    return null;
  }

  if (goal.length > 1000) {
    alert("연습 목표는 1,000자 이하로 입력해주세요.");
    return null;
  }

  return { categoryId, title, goal };
}

function savePractice() {
  const form = validatePracticeForm();
  if (!form) return;

  const editingPracticeId = $("editingPracticeId").value;

  if (editingPracticeId) {
    practices = practices.map((practice) => {
      if (practice.id !== editingPracticeId) return practice;
      return {
        ...practice,
        categoryId: form.categoryId,
        title: form.title,
        goal: form.goal,
        updatedAt: Date.now()
      };
    });
  } else {
    practices.push({
      id: createId("practice"),
      categoryId: form.categoryId,
      title: form.title,
      goal: form.goal,
      status: "TODO",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdDate: todayISO()
    });
  }

  saveData();
  resetPracticeForm();
  setListStatus("TODO");
  setPage("list");
}

function editPractice(practiceId) {
  const practice = practices.find((item) => item.id === practiceId);
  if (!practice || practice.status !== "TODO") return;

  closeModal("detailModal");
  setPage("add");

  $("editingPracticeId").value = practice.id;
  $("practiceFormTitle").textContent = "연습 수정";
  $("practiceCategory").value = practice.categoryId;
  $("practiceTitle").value = practice.title;
  $("practiceGoal").value = practice.goal;
  $("savePracticeBtn").textContent = "수정 저장";
  $("cancelPracticeEditBtn").classList.remove("hidden");
}

function openPracticeDetail(practiceId) {
  const practice = practices.find((item) => item.id === practiceId);
  if (!practice) return;

  selectedPracticeId = practiceId;
  const category = getCategory(practice.categoryId);
  const isDone = practice.status === "DONE";
  const ratingText = "★".repeat(practice.rating || 0) + "☆".repeat(5 - (practice.rating || 0));

  const doneHtml = isDone ? `
    <div class="detail-block">
      <label>완료 정보</label>
      <p class="detail-text">${formatDate(practice.completedDate)} · ${practice.minutes}분 · ${ratingText}</p>
    </div>
    <div class="detail-block">
      <label>연습 방법</label>
      <p class="detail-text">${escapeHtml(practice.method || "선택 안 함")}</p>
    </div>
    <div class="detail-block">
      <label>연습 결과</label>
      <p class="detail-text">${escapeHtml(practice.review || "작성한 내용이 없어요.")}</p>
    </div>
    <div class="detail-block">
      <label>다음 연습 계획</label>
      <p class="detail-text">${escapeHtml(practice.nextPlan || "작성한 내용이 없어요.")}</p>
    </div>
  ` : "";

  const buttonsHtml = isDone ? `
    <button type="button" class="danger" id="deletePracticeBtn">삭제</button>
  ` : `
    <div class="button-row">
      <button type="button" class="secondary" id="editPracticeBtn">수정</button>
      <button type="button" class="danger no-margin" id="deletePracticeBtn">삭제</button>
    </div>
    <button type="button" class="primary" id="completePracticeBtn">완료</button>
  `;

  $("detailContent").innerHTML = `
    <h2 class="detail-title">${escapeHtml(practice.title)}</h2>
    <span class="tag"><span class="dot" style="background:${category.color}"></span>${escapeHtml(category.name)}</span>
    <div class="detail-block">
      <label>연습 목표</label>
      <p class="detail-text">${escapeHtml(practice.goal)}</p>
    </div>
    ${doneHtml}
    ${buttonsHtml}
  `;

  openModal("detailModal");

  $("deletePracticeBtn").addEventListener("click", () => requestDelete("practice", practice.id));

  const editButton = $("editPracticeBtn");
  if (editButton) {
    editButton.addEventListener("click", () => editPractice(practice.id));
  }

  const completeButton = $("completePracticeBtn");
  if (completeButton) {
    completeButton.addEventListener("click", () => {
      closeModal("detailModal");
      openModal("completeConfirmModal");
    });
  }
}

function openCompleteForm() {
  closeModal("completeConfirmModal");
  selectedRating = 0;

  $("completeDate").value = todayISO();
  $("completeDate").max = todayISO();
  $("completeMinutes").value = "";
  $("completeMethod").value = "";
  $("completeReview").value = "";
  $("completeNextPlan").value = "";
  renderRatingStars();

  openModal("completeFormModal");
}

function renderRatingStars() {
  document.querySelectorAll("#ratingStars button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.rating) <= selectedRating);
  });
}

function validateCompleteForm() {
  const completedDate = $("completeDate").value;
  const minutes = Number($("completeMinutes").value);
  const method = $("completeMethod").value;
  const review = $("completeReview").value.trim();
  const nextPlan = $("completeNextPlan").value.trim();

  if (!completedDate) {
    alert("완료일을 선택해주세요.");
    return null;
  }

  if (completedDate > todayISO()) {
    alert("미래 날짜는 선택할 수 없어요.");
    return null;
  }

  if (!minutes || minutes < 1) {
    alert("소요시간은 1분 이상 입력해주세요.");
    return null;
  }

  if (minutes > 999) {
    alert("소요시간은 999분 이하로 입력해주세요.");
    return null;
  }

  if (!selectedRating) {
    alert("만족도를 선택해주세요.");
    return null;
  }

  if (review.length > 2000) {
    alert("연습 결과는 2,000자 이하로 입력해주세요.");
    return null;
  }

  if (nextPlan.length > 2000) {
    alert("다음 연습 계획은 2,000자 이하로 입력해주세요.");
    return null;
  }

  return { completedDate, minutes, method, review, nextPlan, rating: selectedRating };
}

function requestCompleteSave() {
  const completeData = validateCompleteForm();
  if (!completeData) return;

  window.pendingCompleteData = completeData;
  openModal("finalConfirmModal");
}

function finalizeComplete() {
  const completeData = window.pendingCompleteData;
  if (!selectedPracticeId || !completeData) return;

  practices = practices.map((practice) => {
    if (practice.id !== selectedPracticeId) return practice;

    return {
      ...practice,
      status: "DONE",
      completedAt: Date.now(),
      completedDate: completeData.completedDate,
      minutes: completeData.minutes,
      rating: completeData.rating,
      method: completeData.method,
      review: completeData.review,
      nextPlan: completeData.nextPlan,
      updatedAt: Date.now()
    };
  });

  saveData();

  closeModal("finalConfirmModal");
  closeModal("completeFormModal");

  selectedPracticeId = null;
  window.pendingCompleteData = null;

  setListStatus("DONE");
  setPage("list");
}

function requestDelete(type, id) {
  pendingDelete = { type, id };

  if (type === "practice") {
    $("deleteTitle").textContent = "연습을 삭제할까요?";
    $("deleteDesc").textContent = "삭제한 연습은 복구할 수 없어요.";
  }

  if (type === "category") {
    $("deleteTitle").textContent = "카테고리를 삭제할까요?";
    $("deleteDesc").textContent = "삭제한 카테고리는 복구할 수 없어요.";
  }

  openModal("deleteConfirmModal");
}

function confirmDelete() {
  if (!pendingDelete) return;

  if (pendingDelete.type === "practice") {
    practices = practices.filter((practice) => practice.id !== pendingDelete.id);
    closeModal("detailModal");
  }

  if (pendingDelete.type === "category") {
    const used = practices.some((practice) => practice.categoryId === pendingDelete.id);
    if (used) {
      alert("사용 중인 카테고리는 삭제할 수 없습니다.");
      closeModal("deleteConfirmModal");
      pendingDelete = null;
      return;
    }

    categories = categories.filter((category) => category.id !== pendingDelete.id);
  }

  pendingDelete = null;
  saveData();

  closeModal("deleteConfirmModal");
  renderCategorySelects();
  renderPracticeList();
  renderCategoryPanel();
  renderStats();
}

function toggleSettingsPanel(panelName) {
  if (panelName === "category") {
    $("categoryPanel").classList.toggle("hidden");
    $("statsPanel").classList.add("hidden");
    renderCategoryPanel();
  }

  if (panelName === "stats") {
    $("statsPanel").classList.toggle("hidden");
    $("categoryPanel").classList.add("hidden");
    renderStats();
  }
}

function resetCategoryForm() {
  $("editingCategoryId").value = "";
  $("categoryName").value = "";
  $("categoryColor").value = "#5B7CFA";
  $("saveCategoryBtn").textContent = "카테고리 등록";
  $("cancelCategoryEditBtn").classList.add("hidden");
}

function saveCategory() {
  const editingCategoryId = $("editingCategoryId").value;
  const name = $("categoryName").value.trim();
  const color = $("categoryColor").value;

  if (!name) {
    alert("카테고리명을 입력해주세요.");
    return;
  }

  if (name.length > 50) {
    alert("카테고리명은 50자 이하로 입력해주세요.");
    return;
  }

  const duplicated = categories.some((category) => category.name === name && category.id !== editingCategoryId);
  if (duplicated) {
    alert("이미 등록된 카테고리입니다.");
    return;
  }

  if (!editingCategoryId && categories.length >= 5) {
    alert("카테고리는 최대 5개까지 등록 가능합니다.");
    return;
  }

  if (editingCategoryId) {
    categories = categories.map((category) => {
      if (category.id !== editingCategoryId) return category;
      return { ...category, name, color, updatedAt: Date.now() };
    });
  } else {
    categories.push({
      id: createId("category"),
      name,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  saveData();
  resetCategoryForm();
  renderCategorySelects();
  renderCategoryPanel();
  renderPracticeList();
  renderStats();
}

function editCategory(categoryId) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return;

  $("editingCategoryId").value = category.id;
  $("categoryName").value = category.name;
  $("categoryColor").value = category.color;
  $("saveCategoryBtn").textContent = "카테고리 수정";
  $("cancelCategoryEditBtn").classList.remove("hidden");
}

function renderCategoryPanel() {
  if (categories.length === 0) {
    $("categoryList").innerHTML = `<div class="empty">등록된 카테고리가 없어요.</div>`;
    return;
  }

  $("categoryList").innerHTML = categories.map((category) => `
    <div class="category-row">
      <div class="category-name">
        <span class="dot" style="background:${category.color}"></span>
        ${escapeHtml(category.name)}
      </div>
      <button type="button" class="mini-btn" data-edit-category="${category.id}">수정</button>
      <button type="button" class="mini-btn red" data-delete-category="${category.id}">삭제</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-edit-category]").forEach((button) => {
    button.addEventListener("click", () => editCategory(button.dataset.editCategory));
  });

  document.querySelectorAll("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => requestDelete("category", button.dataset.deleteCategory));
  });
}

function renderStats() {
  const donePractices = practices.filter((practice) => practice.status === "DONE");

  const sumMinutes = (items) => items.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const today = new Date(`${todayISO()}T00:00:00`);

  const withinDays = (practice, days) => {
    if (!practice.completedDate) return false;
    const date = new Date(`${practice.completedDate}T00:00:00`);
    const diff = (today - date) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < days;
  };

  $("totalMinutes").textContent = `${sumMinutes(donePractices)}분`;
  $("last30Minutes").textContent = `${sumMinutes(donePractices.filter((practice) => withinDays(practice, 30)))}분`;
  $("last7Minutes").textContent = `${sumMinutes(donePractices.filter((practice) => withinDays(practice, 7)))}분`;

  const maxMinutes = Math.max(
    1,
    ...categories.map((category) => sumMinutes(donePractices.filter((practice) => practice.categoryId === category.id)))
  );

  if (categories.length === 0) {
    $("categoryStats").innerHTML = `<div class="empty">카테고리 데이터가 없어요.</div>`;
    return;
  }

  $("categoryStats").innerHTML = categories.map((category) => {
    const categoryPractices = donePractices.filter((practice) => practice.categoryId === category.id);
    const minutes = sumMinutes(categoryPractices);
    const width = Math.round((minutes / maxMinutes) * 100);

    return `
      <div class="stat-row">
        <div class="stat-row-top">
          <span>${escapeHtml(category.name)}</span>
          <span>${minutes}분 · ${categoryPractices.length}건</span>
        </div>
        <div class="bar">
          <div class="bar-fill" style="width:${width}%;background:${category.color}"></div>
        </div>
      </div>
    `;
  }).join("");
}

document.addEventListener("click", (event) => {
  const modalId = event.target.dataset.close;
  if (modalId) closeModal(modalId);
});

$("navList").addEventListener("click", () => setPage("list"));
$("navAdd").addEventListener("click", () => setPage("add"));
$("navSettings").addEventListener("click", () => setPage("settings"));

$("todoTab").addEventListener("click", () => setListStatus("TODO"));
$("doneTab").addEventListener("click", () => setListStatus("DONE"));
$("categoryFilter").addEventListener("change", renderPracticeList);

$("savePracticeBtn").addEventListener("click", savePractice);
$("cancelPracticeEditBtn").addEventListener("click", () => {
  resetPracticeForm();
  setPage("list");
});

$("goCategoryFromAdd").addEventListener("click", () => {
  setPage("settings");
  $("categoryPanel").classList.remove("hidden");
  $("statsPanel").classList.add("hidden");
});

$("openCategoryPanel").addEventListener("click", () => toggleSettingsPanel("category"));
$("openStatsPanel").addEventListener("click", () => toggleSettingsPanel("stats"));

$("saveCategoryBtn").addEventListener("click", saveCategory);
$("cancelCategoryEditBtn").addEventListener("click", resetCategoryForm);

$("openCompleteFormBtn").addEventListener("click", openCompleteForm);
$("saveCompleteBtn").addEventListener("click", requestCompleteSave);
$("finalCompleteBtn").addEventListener("click", finalizeComplete);
$("confirmDeleteBtn").addEventListener("click", confirmDelete);

document.querySelectorAll("#ratingStars button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.rating);
    renderRatingStars();
  });
});

renderCategorySelects();
renderPracticeList();
renderCategoryPanel();
renderStats();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
