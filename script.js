// Firebase Authentication Handlers
async function registerUser() {
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const name = document.getElementById("registerName").value;

  if (!email || !password || !name) {
    alert("Please enter your name, email, and password.");
    return;
  }

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    await user.updateProfile({ displayName: name });
    await user.reload();

    const refreshedUser = firebase.auth().currentUser;
    loadProfileInfo(refreshedUser);
    updateWelcomeText(refreshedUser);

    document.getElementById("registerSection").style.display = "none";
    document.querySelector(".container").style.display = "block";
    document.querySelector("footer").style.display = "block";
    document.body.classList.remove("auth-active");
  } catch (error) {
    alert(error.message);
  }
}

function loginUser() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      loadProfileInfo(user);
      updateWelcomeText(user);
      loadTasks(user.uid);

      document.getElementById("loginSection").style.display = "none";
      document.getElementById("registerSection").style.display = "none";
      document.querySelector(".container").style.display = "block";
      document.querySelector("footer").style.display = "block";
      document.body.classList.remove("auth-active");
    })
    .catch((error) => {
      alert(error.message);
    });
}

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loadProfileInfo(user);
    updateWelcomeText(user);
    loadTasks(user.uid);
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("registerSection").style.display = "none";
    document.querySelector(".container").style.display = "block";
    document.querySelector("footer").style.display = "block";
    document.body.classList.remove("auth-active");
  } else {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("registerSection").style.display = "none";
    document.querySelector(".container").style.display = "none";
    document.querySelector("footer").style.display = "none";
    document.body.classList.add("auth-active");
  }
});

function logoutUser() {
  firebase.auth().signOut().then(() => {
    document.getElementById("loginSection").style.display = "flex";
    document.getElementById("registerSection").style.display = "none";
    document.querySelector(".container").style.display = "none";
    document.querySelector("footer").style.display = "none";
    document.body.classList.add("auth-active");
  });
}

function showRegister() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("registerSection").style.display = "flex";
  document.body.classList.add("auth-active");
}

function showLogin() {
  document.getElementById("registerSection").style.display = "none";
  document.getElementById("loginSection").style.display = "flex";
  document.body.classList.add("auth-active");
}

function loadProfileInfo(user) {
  document.getElementById("profileName").value = user.displayName || "";
  document.getElementById("profileEmail").value = user.email || "";
}

function updateWelcomeText(user) {
  const welcomeText = document.querySelector(".welcome h2");
  if (welcomeText && user.displayName) {
    welcomeText.innerText = `Hello, ${user.displayName} 👋`;
  }
}

// Task Persistence using Firestore
const db = firebase.firestore();

function saveTaskToFirestore(task, userId) {
  db.collection("users").doc(userId).collection("tasks").add(task);
}

function loadTasks(userId) {
  const taskContainer = document.getElementById("taskContainer");
  taskContainer.innerHTML = "";

  db.collection("users").doc(userId).collection("tasks").get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const taskItem = document.createElement("div");
        taskItem.classList.add("task-item");

        taskItem.innerHTML = `
          <h4>${data.name}</h4>
          <p>Deadline: ${data.deadline}</p>
          ${data.priority ? "<p><strong>Priority</strong></p>" : ""}
          ${data.project ? "<p><strong>Project Task</strong></p>" : ""}
          <label class="done-label"><input type="checkbox" onchange="updateTaskStatus(this)" ${data.completed ? "checked" : ""}> Mark as Done</label>
          <button class="delete-btn" onclick="deleteTask(this)">Delete</button>
        `;

        taskContainer.appendChild(taskItem);
      });
      updateStats();
    });
}

// Navigation Buttons
document.getElementById("homeButton").addEventListener("click", showOverview);
document.getElementById("showAddTaskForm").addEventListener("click", () => {
  document.getElementById("overviewSection").style.display = "none";
  document.getElementById("allTasksSection").style.display = "none";
  document.getElementById("addTaskForm").style.display = "block";
  document.getElementById("profileSection").style.display = "none";
});
document.getElementById("profileButton").addEventListener("click", () => {
  document.getElementById("overviewSection").style.display = "none";
  document.getElementById("allTasksSection").style.display = "none";
  document.getElementById("addTaskForm").style.display = "none";
  document.getElementById("profileSection").style.display = "block";
});

// Tabs
function showOverview() {
  document.getElementById("overviewSection").style.display = "block";
  document.getElementById("allTasksSection").style.display = "none";
  document.getElementById("addTaskForm").style.display = "none";
  document.getElementById("profileSection").style.display = "none";
  document.getElementById("overviewTab").classList.add("active");
  document.getElementById("allTasksTab").classList.remove("active");
}

function showAllTasksView() {
  document.getElementById("overviewSection").style.display = "none";
  document.getElementById("allTasksSection").style.display = "block";
  document.getElementById("addTaskForm").style.display = "none";
  document.getElementById("profileSection").style.display = "none";
  document.getElementById("overviewTab").classList.remove("active");
  document.getElementById("allTasksTab").classList.add("active");
}

document.getElementById("overviewTab").addEventListener("click", showOverview);
document.getElementById("allTasksTab").addEventListener("click", showAllTasksView);

// Task Add/Cancel
document.getElementById("cancelTaskButton").addEventListener("click", () => {
  document.getElementById("addTaskForm").style.display = "none";
  showAllTasksView();
});

document.getElementById("saveTaskButton").addEventListener("click", () => {
  const taskName = document.getElementById("taskName").value;
  const taskDeadline = document.getElementById("taskDeadline").value;
  const isPriority = document.getElementById("taskPriority").checked;
  const isProject = document.getElementById("taskProject").checked;
  const user = firebase.auth().currentUser;

  if (!taskName || !taskDeadline || !user) {
    alert("Please fill out the task name, deadline, and make sure you're logged in.");
    return;
  }

  const task = {
    name: taskName,
    deadline: taskDeadline,
    priority: isPriority,
    project: isProject,
    completed: false,
    createdAt: new Date().toISOString()
  };

  saveTaskToFirestore(task, user.uid);

  const taskItem = document.createElement("div");
  taskItem.classList.add("task-item", "newly-added");

  taskItem.innerHTML = `
    <h4>${task.name}</h4>
    <p>Deadline: ${task.deadline}</p>
    ${task.priority ? "<p><strong>Priority</strong></p>" : ""}
    ${task.project ? "<p><strong>Project Task</strong></p>" : ""}
    <label class="done-label"><input type="checkbox" onchange="updateTaskStatus(this)"> Mark as Done</label>
    <button class="delete-btn" onclick="deleteTask(this)">Delete</button>
  `;

  document.getElementById("taskContainer").prepend(taskItem);

  showAllTasksView();

  setTimeout(() => {
    taskItem.classList.add("flash-green");
    setTimeout(() => {
      taskItem.classList.remove("flash-green");
    }, 1000);
  }, 100);

  document.getElementById("addTaskForm").style.display = "none";
  document.getElementById("taskName").value = "";
  document.getElementById("taskDeadline").value = "";
  document.getElementById("taskPriority").checked = false;
  document.getElementById("taskProject").checked = false;

  updateStats();
});

function updateTaskStatus(checkbox) {
  checkbox.parentElement.parentElement.style.opacity = checkbox.checked ? 0.5 : 1;
  updateStats();
}

function deleteTask(button) {
  const taskElement = button.parentElement;
  const taskName = taskElement.querySelector("h4").innerText;
  const user = firebase.auth().currentUser;

  if (!user) return;

  db.collection("users").doc(user.uid).collection("tasks")
    .where("name", "==", taskName)
    .limit(1)
    .get()
    .then((querySnapshot) => {
      if (!querySnapshot.empty) {
        querySnapshot.docs[0].ref.delete();
      }
    });

  taskElement.remove();
  updateStats();
}

function updateStats() {
  const tasks = document.querySelectorAll(".task-item");
  const completed = document.querySelectorAll(".task-item input[type='checkbox']:checked");
  const projects = Array.from(tasks).filter(task => {
    return task.innerHTML.includes("<strong>Project Task</strong>");
  });
  const incomplete = Array.from(tasks).filter(task => {
    return !task.querySelector("input[type='checkbox']").checked;
  });

  document.getElementById("totalTasksCount").innerText = tasks.length;
  document.getElementById("completedTasksCount").innerText = completed.length;
  document.getElementById("totalProjectsCount").innerText = projects.length;
  document.getElementById("priorityProgressText").innerText = `${completed.length}/${tasks.length} is completed`;
  document.querySelector(".notification-badge").innerText = incomplete.length;

  const percent = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
  document.getElementById("priorityProgressBar").style.width = percent + "%";
  document.getElementById("priorityProgressPercent").innerText = percent + "%";
}

function showAllTasks() {
  showAllTasksView();
}
