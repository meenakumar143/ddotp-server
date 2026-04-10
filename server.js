const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://sandbookingord_db_user:TzsFjhlxFvhbwXbo@ddotp-cluster.zqakueo.mongodb.net/ddotp?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

const ADMIN = {
  username: "admin",
  password: "1234"
};

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  stockyard: String,
  vehicle: String,
  delivery_code: String,
  expiry: Number
});

const User = mongoose.model("User", UserSchema);

app.get("/", (req, res) => {
  res.send("DDOTP Server Running with DB");
});

app.get("/otp", (req, res) => {
  res.json({ otp: 1234 });
});

app.get("/admin", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>DDOTP Admin Panel</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #111;
      color: white;
      margin: 0;
      padding: 20px;
    }
    .box {
      max-width: 1100px;
      margin: auto;
      background: #1c1c1c;
      padding: 20px;
      border-radius: 10px;
    }
    input, select {
      margin: 5px;
      padding: 10px;
      border: none;
      border-radius: 5px;
      width: 220px;
    }
    button {
      margin: 5px;
      padding: 10px 16px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    }
    .login-btn, .create-btn, .refresh-btn, .update-btn {
      background: #00b894;
      color: white;
    }
    .delete-btn, .logout-btn {
      background: #d63031;
      color: white;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 20px;
      background: #222;
    }
    th, td {
      border: 1px solid #444;
      padding: 10px;
      text-align: center;
    }
    th {
      background: #333;
    }
    #panelBox {
      display: none;
    }
    #msg {
      color: yellow;
      margin-top: 10px;
    }
  </style>
</head>
<body>

<div class="box" id="loginBox">
  <h2>DDOTP Admin Login</h2>
  <input id="adminUser" placeholder="Admin Username">
  <input id="adminPass" type="password" placeholder="Admin Password">
  <button class="login-btn" onclick="adminLogin()">Login</button>
  <div id="msg"></div>
</div>

<div class="box" id="panelBox">
  <h2>DDOTP Admin Panel</h2>
  <button class="logout-btn" onclick="logout()">Logout</button>

  <h3>Create User</h3>
  <input id="username" placeholder="Username">
  <input id="password" placeholder="Password">
  <select id="days">
    <option value="1">1 Day</option>
    <option value="3">3 Days</option>
    <option value="7">7 Days</option>
    <option value="30">30 Days</option>
  </select>
  <button class="create-btn" onclick="createUser()">Create</button>

  <h3>Users List</h3>
  <button class="refresh-btn" onclick="loadUsers()">Refresh</button>

  <table id="table">
    <thead>
      <tr>
        <th>User</th>
        <th>Password</th>
        <th>Vehicle</th>
        <th>Stockyard</th>
        <th>Delivery Code</th>
        <th>Expiry</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<script>
function adminLogin() {
  fetch("/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: document.getElementById("adminUser").value,
      password: document.getElementById("adminPass").value
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      localStorage.setItem("ddotp_admin_logged", "yes");
      document.getElementById("loginBox").style.display = "none";
      document.getElementById("panelBox").style.display = "block";
      loadUsers();
    } else {
      document.getElementById("msg").innerText = "Invalid admin login";
    }
  })
  .catch(() => {
    document.getElementById("msg").innerText = "Login error";
  });
}

function logout() {
  localStorage.removeItem("ddotp_admin_logged");
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("panelBox").style.display = "none";
}

function checkLogin() {
  if (localStorage.getItem("ddotp_admin_logged") === "yes") {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("panelBox").style.display = "block";
    loadUsers();
  }
}

function createUser() {
  fetch("/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: document.getElementById("username").value,
      password: document.getElementById("password").value,
      days: document.getElementById("days").value
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(JSON.stringify(data));
    loadUsers();
  });
}

function loadUsers() {
  fetch("/admin/users")
  .then(res => res.json())
  .then(data => {
    let html = "";
    for (let user in data) {
      const expiryText = data[user].expiry
        ? new Date(data[user].expiry).toLocaleString()
        : "";

      html += \`
      <tr>
        <td>\${user}</td>
        <td><input value="\${data[user].password || ""}" id="p_\${user}"></td>
        <td><input value="\${data[user].vehicle || ""}" id="v_\${user}"></td>
        <td><input value="\${data[user].stockyard || ""}" id="s_\${user}"></td>
        <td><input value="\${data[user].delivery_code || ""}" id="d_\${user}"></td>
        <td>\${expiryText}</td>
        <td>
          <button class="update-btn" onclick="updateUser('\${user}')">Update</button>
          <button class="delete-btn" onclick="deleteUser('\${user}')">Delete</button>
        </td>
      </tr>\`;
    }
    document.querySelector("#table tbody").innerHTML = html;
  });
}

function updateUser(user) {
  fetch("/admin/update-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: user,
      vehicle: document.getElementById("v_" + user).value,
      stockyard: document.getElementById("s_" + user).value,
      delivery_code: document.getElementById("d_" + user).value
    })
  })
  .then(res => res.json())
  .then(data => {
    alert(JSON.stringify(data));
    loadUsers();
  });
}

function deleteUser(user) {
  fetch("/admin/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user })
  })
  .then(res => res.json())
  .then(data => {
    alert(JSON.stringify(data));
    loadUsers();
  });
}

checkLogin();
</script>

</body>
</html>`);
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN.username && password === ADMIN.password) {
    return res.json({ status: "success" });
  }

  res.json({ status: "invalid" });
});

app.post("/admin/create-user", async (req, res) => {
  try {
    const { username, password, days } = req.body;

    if (!username || !password) {
      return res.json({ status: "missing_fields" });
    }

    const exist = await User.findOne({ username });
    if (exist) {
      return res.json({ status: "exists" });
    }

    const totalDays = parseInt(days || 1, 10);
    const expiry = Date.now() + (totalDays * 24 * 60 * 60 * 1000);

    const user = new User({
      username,
      password,
      stockyard: "",
      vehicle: "",
      delivery_code: "",
      expiry
    });

    await user.save();
    res.json({ status: "created", expiry });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "error" });
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find();
    const result = {};

    users.forEach(u => {
      result[u.username] = {
        password: u.password,
        stockyard: u.stockyard,
        vehicle: u.vehicle,
        delivery_code: u.delivery_code,
        expiry: u.expiry
      };
    });

    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "error" });
  }
});

app.post("/admin/update-user", async (req, res) => {
  try {
    const { username, vehicle, stockyard, delivery_code } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.json({ status: "not_found" });
    }

    user.vehicle = vehicle || "";
    user.stockyard = stockyard || "";
    user.delivery_code = delivery_code || "";
    await user.save();

    res.json({ status: "updated" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "error" });
  }
});

app.post("/admin/delete-user", async (req, res) => {
  try {
    const { username } = req.body;
    await User.deleteOne({ username });
    res.json({ status: "deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "error" });
  }
});

app.get("/api/user/stockyard/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.json({ status: "error" });
    }

    if (Date.now() > user.expiry) {
      return res.json({ status: "expired" });
    }

    res.json({
      status: "success",
      stockyard: user.stockyard || "",
      vehicle: user.vehicle || "",
      delivery_code: user.delivery_code || ""
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "error" });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server running with MongoDB...");
});
