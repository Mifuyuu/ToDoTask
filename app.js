// ===== ดึง element จากหน้าเว็บ =====
const addForm = document.getElementById("addForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyText = document.getElementById("emptyText");
const xpEl = document.getElementById("xp");
const streakEl = document.getElementById("streak");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const owl = document.getElementById("owl");
const speech = document.getElementById("speech");
const celebrate = document.getElementById("celebrate");
const filterButtons = document.querySelectorAll(".filter");
const activityGrid = document.getElementById("activityGrid");
const activityTotal = document.getElementById("activityTotal");

const XP_PER_TASK = 10;
const GRID_WEEKS = 26; // แสดงย้อนหลังกี่สัปดาห์ (ประมาณ 6 เดือน)
const STORAGE_KEY = "todolingo-data";

// ไอคอนจาก Heroicons (https://heroicons.com) แบบ outline
const ICON_CHECK = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>';
const ICON_TRASH = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';

// ===== ข้อมูลของแอป =====
let data = {
  tasks: [],          // { id, text, done, doneDate }
  xp: 0,
  streak: 0,
  lastDoneDate: "",   // วันที่ทำงานเสร็จล่าสุด (ไว้คำนวณ streak)
  history: {}         // จำนวนงานที่ทำเสร็จในแต่ละวัน เช่น { "2026-9-27": 3 }
};

let currentFilter = "all";

// ข้อความให้กำลังใจ สุ่มมาแสดง
const cheerMessages = [
  "เก่งมาก! 🎉",
  "สุดยอดไปเลย!",
  "ทำได้ดีมาก! 💪",
  "ไปต่อเลย!",
  "เยี่ยม! +10 XP"
];

// ===== บันทึก / โหลดข้อมูลจาก Local Storage =====
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch (e) {
      console.log("ข้อมูลเสีย เริ่มใหม่", e);
    }
  }
  // ข้อมูลเก่าที่บันทึกไว้ก่อนมี history
  if (!data.history) {
    data.history = {};
  }
}

// ===== แปลงวันที่เป็นข้อความ เช่น "2026-9-27" =====
function dateKey(d) {
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function getToday() {
  return dateKey(new Date());
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

// ถ้าไม่ได้ทำงานเมื่อวานหรือวันนี้ streak จะหาย
function checkStreak() {
  if (data.lastDoneDate !== getToday() && data.lastDoneDate !== getYesterday()) {
    data.streak = 0;
  }
}

// เรียกตอนทำงานเสร็จ เพื่อนับ streak
function updateStreak() {
  const today = getToday();
  if (data.lastDoneDate === today) return; // วันนี้นับไปแล้ว

  if (data.lastDoneDate === getYesterday()) {
    data.streak = data.streak + 1;
  } else {
    data.streak = 1;
  }
  data.lastDoneDate = today;
  popEffect(streakEl);
}

// ===== แสดงผลรายการงาน =====
function render() {
  taskList.innerHTML = "";

  // กรองงานตามปุ่มที่เลือก
  const filtered = data.tasks.filter(function (task) {
    if (currentFilter === "active") return !task.done;
    if (currentFilter === "done") return task.done;
    return true;
  });

  filtered.forEach(function (task) {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");
    li.dataset.id = task.id;

    const checkBtn = document.createElement("button");
    checkBtn.className = "check";
    checkBtn.innerHTML = task.done ? ICON_CHECK : "";
    checkBtn.setAttribute("aria-label", "ทำเครื่องหมายว่าเสร็จ");
    checkBtn.addEventListener("click", function () {
      toggleTask(task.id, checkBtn);
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text; // ใช้ textContent กันการแทรก HTML

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.innerHTML = ICON_TRASH;
    delBtn.setAttribute("aria-label", "ลบงาน");
    delBtn.addEventListener("click", function () {
      deleteTask(task.id, li);
    });

    li.appendChild(checkBtn);
    li.appendChild(text);
    li.appendChild(delBtn);
    taskList.appendChild(li);
  });

  emptyText.style.display = filtered.length === 0 ? "block" : "none";
  updateStats();
}

// อัปเดต XP, streak และแถบความคืบหน้า
function updateStats() {
  xpEl.textContent = data.xp;
  streakEl.textContent = data.streak;

  const total = data.tasks.length;
  const doneCount = data.tasks.filter(function (t) { return t.done; }).length;
  const percent = total === 0 ? 0 : (doneCount / total) * 100;

  progressFill.style.width = percent + "%";
  progressText.textContent = doneCount + "/" + total;

  renderActivityGrid();
}

// ===== Activities Grid แบบ GitHub =====
// แต่ละคอลัมน์คือ 1 สัปดาห์ (อาทิตย์ -> เสาร์) คอลัมน์ขวาสุดคือสัปดาห์นี้
function renderActivityGrid() {
  activityGrid.innerHTML = "";

  const today = new Date();
  // วันแรกของตาราง = วันอาทิตย์ของ (GRID_WEEKS - 1) สัปดาห์ก่อน
  const day = new Date();
  day.setHours(0, 0, 0, 0); // เริ่มที่เที่ยงคืน จะได้ไม่เกินเวลาของ today
  day.setDate(today.getDate() - today.getDay() - (GRID_WEEKS - 1) * 7);

  let total = 0;

  // วนทีละวันจนถึงวันนี้
  while (day <= today) {
    const count = data.history[dateKey(day)] || 0;
    total = total + count;

    const cell = document.createElement("div");
    cell.className = "cell level-" + getLevel(count);
    cell.title = day.toLocaleDateString("th-TH") + " : ทำเสร็จ " + count + " งาน";
    activityGrid.appendChild(cell);

    day.setDate(day.getDate() + 1);
  }

  activityTotal.textContent = "ทำเสร็จ " + total + " งาน";
}

// ยิ่งทำเยอะ level ยิ่งสูง สียิ่งเข้ม
function getLevel(count) {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// ===== เพิ่มงาน =====
addForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const text = taskInput.value.trim();

  if (text === "") {
    // ช่องว่าง -> สั่นช่อง input + มาสคอตส่ายหัว
    taskInput.classList.add("error");
    setTimeout(function () { taskInput.classList.remove("error"); }, 400);
    owlSay("อย่าลืมพิมพ์ชื่องานนะ!", "shake");
    return;
  }

  data.tasks.unshift({
    id: Date.now(),
    text: text,
    done: false
  });

  taskInput.value = "";
  saveData();
  render();
  owlSay("เพิ่มภารกิจแล้ว! สู้ ๆ นะ", "jump");
});

// ===== ติ๊กงานเสร็จ / ยกเลิก =====
function toggleTask(id, button) {
  const task = data.tasks.find(function (t) { return t.id === id; });
  task.done = !task.done;

  if (task.done) {
    // จดลงประวัติของวันนี้
    task.doneDate = getToday();
    data.history[task.doneDate] = (data.history[task.doneDate] || 0) + 1;

    data.xp = data.xp + XP_PER_TASK;
    updateStreak();
    showXpFloat(button);
    popEffect(xpEl);
    const msg = cheerMessages[Math.floor(Math.random() * cheerMessages.length)];
    owlSay(msg, "jump");
  } else {
    // ยกเลิก -> ลบออกจากประวัติของวันที่เคยติ๊กไว้
    if (data.history[task.doneDate] > 0) {
      data.history[task.doneDate] = data.history[task.doneDate] - 1;
    }

    data.xp = Math.max(0, data.xp - XP_PER_TASK);
    owlSay("ไม่เป็นไร ลองใหม่ได้!", "shake");
  }

  saveData();
  render();

  // ทำครบทุกงาน -> ฉลอง!
  const allDone = data.tasks.length > 0 && data.tasks.every(function (t) { return t.done; });
  if (task.done && allDone) {
    showCelebrate();
  }
}

// ===== ลบงาน =====
function deleteTask(id, li) {
  li.classList.add("removing");
  // รอให้อนิเมชันเล่นจบก่อนค่อยลบจริง
  setTimeout(function () {
    data.tasks = data.tasks.filter(function (t) { return t.id !== id; });
    saveData();
    render();
  }, 300);
}

document.getElementById("clearDone").addEventListener("click", function () {
  const hasDone = data.tasks.some(function (t) { return t.done; });
  if (!hasDone) {
    owlSay("ยังไม่มีงานที่เสร็จเลยนะ", "shake");
    return;
  }
  data.tasks = data.tasks.filter(function (t) { return !t.done; });
  saveData();
  render();
  owlSay("เคลียร์เรียบร้อย! ✨", "jump");
});

// ===== ปุ่มกรอง =====
filterButtons.forEach(function (btn) {
  btn.addEventListener("click", function () {
    filterButtons.forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

// ===== เอฟเฟกต์ต่าง ๆ =====

// ให้มาสคอตพูด + ขยับ (action = "jump" หรือ "shake")
function owlSay(message, action) {
  speech.textContent = message;
  // รีสตาร์ทอนิเมชันกล่องคำพูด
  speech.style.animation = "none";
  speech.offsetHeight; // บังคับให้ browser วาดใหม่
  speech.style.animation = "";

  owl.classList.remove("jump", "shake");
  owl.offsetHeight;
  owl.classList.add(action);
  setTimeout(function () { owl.classList.remove(action); }, 600);
}

// ตัวเลขเด้ง
function popEffect(el) {
  el.parentElement.classList.remove("pop");
  el.parentElement.offsetHeight;
  el.parentElement.classList.add("pop");
}

// "+10 XP" ลอยขึ้นจากปุ่มที่กด
function showXpFloat(button) {
  const rect = button.getBoundingClientRect();
  const float = document.createElement("div");
  float.className = "xp-float";
  float.textContent = "+" + XP_PER_TASK + " XP";
  float.style.left = rect.left + "px";
  float.style.top = rect.top + "px";
  document.body.appendChild(float);
  setTimeout(function () { float.remove(); }, 1000);
}

// พลุกระดาษหลากสี
function launchConfetti() {
  const colors = ["#58cc02", "#1cb0f6", "#ff9600", "#ff4b4b", "#ce82ff", "#ffc800"];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 2 + Math.random() * 2 + "s";
    piece.style.animationDelay = Math.random() * 0.5 + "s";
    document.body.appendChild(piece);
    setTimeout(function () { piece.remove(); }, 4500);
  }
}

function showCelebrate() {
  celebrate.classList.add("show");
  launchConfetti();
}

document.getElementById("closeCelebrate").addEventListener("click", function () {
  celebrate.classList.remove("show");
});

// ===== เริ่มต้นแอป =====
loadData();
checkStreak();
saveData();
render();
