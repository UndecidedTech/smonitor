require("dotenv").config();
const express = require("express");
const { exec } = require("child_process");
const nodemailer = require("nodemailer")
const axios = require("axios");

const statusObj = {};

const smtpTransport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.GMAILUSER,
    pass: process.env.GMAILPW
  }
});

const pingServer = (serverIp) => {
  exec(`ping -c 1 ${serverIp}`, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      serverStatusFlag.isUp = false;
    }
    if (stderr) {
      serverStatusFlag.isUp = false;
      console.error(stderr);
    }

    console.log("Ping Result: ", stdout);
    return "Is Up"
  })
}

const curlServer = async (serverIp, port) => {
  let res = await axios.get(port ? `http://${serverIp}:${port}` : `http://${serverIp}`);
  if (res.status === 200) {
    return "Is Up"
  } else {
    serverStatusFlag.isUp = false;
    return "Is Down"
  }
}

// check server status func
const checkStatus = () => {
  // Baremetal Hypervisor
  statusObj["4chan"].hv = pingServer(process.env.HYPERVISOR);

  // services

  // Deluge
  const delugeService = curlServer(process.env.WSG, 8112);
  const delugeStatus = pingServer(process.env.WSG);

  statusObj.wsg.deluge = curlServer(process.env.WSG, 8112);
  statusObj.wsg.status = pingServer(process.env.WSG);

  // radarr
  const radarrService = curlServer(process.env.G, 7879);
  const radarrStatus = pingServer(process.env.G);

  statusObj.g.radarr = curlServer(process.env.G, 7878);
  statusObj.g.status = pingServer(process.env.G);

  //prowlarr
  const prowlarrService = curlServer(process.env.G, 9696);
  statusObj.g.prowlarr = curlServer(process.env.G, 9696);

  // Plex
  const plexStatus = pingServer(process.env.TV);
  const plexService = curlServer(process.env.TV);

  statusObj.tv.status = pingServer(process.env.TV);
  statusObj.tv.plex = curlServer(process.env.TV);

  let cStatus = [delugeService, delugeStatus, radarrService, radarrStatus, prowlarrService, plexStatus, plexService];

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
  if (serverStatusFlag.isUp) {
    checkStatus();
  } else {
    if (!serverStatusFlag.emailSent) {
      // send email here
      emailSent();
      serverStatusFlag.emailSent = true;
    }
  }
}, 10000);

