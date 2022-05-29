require("dotenv").config();
const express = require("express");
const util = require("util");
const nodemailer = require("nodemailer")
const axios = require("axios");

const exec = util.promisify(require('child_process').exec);


const statusObj = {
  hv: {},
  wsg: {},
  g: {},
  tv: {}
};

const smtpTransport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAILUSER,
    pass: process.env.GMAILPW
  }
});

const pingServer = async (serverIp) => {
  try {
    const { stdout, stderr } = await exec(`ping -c 1 ${serverIp}`);

    if (stderr) {
      serverStatusFlag.isUp = false;
      return "Is Down"
    }

    return "Is Up";

  } catch (err) {
    serverStatusFlag.isUp = false;
    return "Is Down"
  }
}

const curlServer = async (serverIp, port) => {
  try {
    let res = await axios.get(port ? `http://${serverIp}:${port}` : `http://${serverIp}`);
    if (res.status === 200)
      return "Is Up"
    else
      return "Is Down"
  } catch (error) {
    serverStatusFlag.isUp = false;
    return "Is Down"
  }
}

// check server status func
const checkStatus = async () => {
  // Baremetal Hypervisor
  const hvStatus = await pingServer(process.env.HYPERVISOR);
  statusObj.hv.status = await pingServer(process.env.HYPERVISOR);

  // services

  // Deluge
  const delugeService = await curlServer(process.env.WSG, 8112);
  const delugeStatus = await pingServer(process.env.WSG);

  statusObj.wsg.deluge = await curlServer(process.env.WSG, 8112);
  statusObj.wsg.status = await pingServer(process.env.WSG);

  // radarr
  const radarrService = await curlServer(process.env.G, 7879);
  const radarrStatus = await pingServer(process.env.G);

  statusObj.g.radarr = await curlServer(process.env.G, 7878);
  statusObj.g.status = await pingServer(process.env.G);

  //prowlarr
  const prowlarrService = await curlServer(process.env.G, 9696);
  statusObj.g.prowlarr = await curlServer(process.env.G, 9696);

  // Plex
  const plexStatus = await pingServer(process.env.TV);
  const plexService = await curlServer(process.env.TV);

  statusObj.tv.status = await pingServer(process.env.TV);
  statusObj.tv.plex = await curlServer(process.env.TV);

  let cStatus = [hvStatus, delugeService, delugeStatus, radarrService, radarrStatus, prowlarrService, plexStatus, plexService];
  console.log(cStatus);
  // check every and if they all == "Is Up"
  // reset the 

  let everyCheck = cStatus.every((status) => {
    if (status === "Is Up") {
      return true;
    } else {
      return false;
    }
  })



  if (everyCheck) {
    serverStatusFlag.emailSent = false;
    serverStatusFlag.isUp = true;
  }
};


// using a flag to prevent sending additional emails if uneccessary 
let serverStatusFlag = {
  isUp: true,
  emailSent: false
};

setInterval(() => {
  console.log(statusObj);
  if (serverStatusFlag.isUp === true) {
    checkStatus();
  } else {
    if (!serverStatusFlag.emailSent) {
      // send email here
      // emailSent();
      serverStatusFlag.emailSent = true;
    }
  }
}, 10000);


const app = express();

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index", {
    statusObj
  });
});

app.listen(8080, () => console.log("express app is running"));

