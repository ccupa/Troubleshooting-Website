const scenarios = {
  internet: {
    title: "“I can’t reach the internet.”",

    context:
      "<strong>Context</strong> · A user’s laptop connects to the office Wi-Fi, but websites will not load. Start at the user’s device and move outward.",

    completeTitle: "Web access restored.",

    completeMessage:
      "You located the failed layer, corrected the DNS path, and verified the service again. That is the troubleshooting loop: observe, isolate, fix, confirm.",

    symptom: "Websites would not load",
    cause: "DNS resolution failure",
    fix: "Correct DNS settings, then retest",

    checks: [
      {
        title: "Is the device connected to the network?",
        desc: "Look at the Wi-Fi or Ethernet indicator. We are checking the device’s local connection before testing anything farther away.",
        command: "ipconfig /all",
        output: "Wi-Fi adapter: Connected",
        meaning: "The device has a local link. We can move one step farther out and check its address.",
        pass: true,
        fix: "Reconnect to the correct network and confirm the adapter is enabled."
      },
      {
        title: "Did the device receive a valid IP address?",
        desc: "In the output, find the IPv4 address. An address like 169.254.x.x usually means the device could not reach DHCP.",
        command: "ipconfig",
        output: "IPv4 Address . . . : 192.168.1.24",
        meaning: "The device received a usable address. Next, test the route to the local gateway.",
        pass: true,
        fix: "Renew the lease with ipconfig /release then ipconfig /renew."
      },
      {
        title: "Can it reach the default gateway?",
        desc: "The gateway is the first hop out of the local network. A reply proves the local path is working.",
        command: "ping <default-gateway>",
        output: "Reply from 192.168.1.1: bytes=32 time=2ms",
        meaning: "The local path is responding. The issue is farther out than the device and gateway.",
        pass: true,
        fix: "Check the AP or switch link and confirm the gateway matches the network."
      },
      {
        title: "Can it reach an IP on the internet?",
        desc: "Use a known public IP to separate routing problems from DNS problems.",
        command: "ping 1.1.1.1",
        output: "Reply from 1.1.1.1: bytes=32 time=18ms",
        meaning: "Internet routing works. If websites still fail, name resolution is the likely layer.",
        pass: true,
        fix: "Verify the router’s WAN status and firewall policy."
      },
      {
        title: "Can DNS resolve a hostname?",
        desc: "Test the translation from a name to an IP address.",
        command: "nslookup example.com",
        output: "DNS request timed out. Server: 192.168.1.99",
        meaning: "This is the first failed layer. The configured DNS server is not responding.",
        pass: false,
        fix: "Change the DNS server to a working internal or public resolver, then test again."
      },
      {
        title: "Does the service itself respond?",
        desc: "Test the specific destination and port.",
        command: "curl -I https://example.com",
        output: "HTTP/2 200 OK",
        meaning: "The service responds after the DNS fix. Document the evidence and close the ticket.",
        pass: true,
        fix: "Check service status and proxy or firewall logs."
      }
    ]
  },

  printer: {
    title: "“The printer is not printing.”",

    context:
      "<strong>Context</strong> · A user can see the office printer, but their document stays in the queue. Start with the printer, then test the computer-to-printer path.",

    completeTitle: "Test page printed.",

    completeMessage:
      "You found that the print queue was paused, cleared the stuck job, and verified the printer with a test page. Observe, isolate, fix, confirm.",

    symptom: "Document stayed in the queue",
    cause: "Paused print queue",
    fix: "Resume the queue, clear the stuck job, then print a test page",

    checks: [
      {
        title: "Is the printer powered on and ready?",
        desc: "Check the display or status lights. A printer that is off or showing an error cannot process a job.",
        command: "Check printer display",
        output: "Status: Ready · Paper: OK · Toner: OK",
        meaning: "The printer is ready to receive a job.",
        pass: true,
        fix: "Power on the printer and clear any paper or toner warning."
      },
      {
        title: "Can the computer reach the printer?",
        desc: "Confirm the computer can communicate with the printer on the office network.",
        command: "ping PRINTER-04",
        output: "Reply from 192.168.1.45: bytes=32 time=3ms",
        meaning: "The network path is working. The problem is likely in the print service or queue.",
        pass: true,
        fix: "Check the printer connection, cable, Wi-Fi, or assigned IP address."
      },
      {
        title: "Is the correct printer selected?",
        desc: "Users often send a job to a saved PDF printer or an old device with a similar name.",
        command: "Settings > Printers & scanners",
        output: "Default printer: Office Printer 04",
        meaning: "The user selected the correct destination. Continue to inspect the queue.",
        pass: true,
        fix: "Select Office Printer 04 and set it as the default printer."
      },
      {
        title: "Is the print queue moving?",
        desc: "A paused queue or stuck first job can prevent every later document from printing.",
        command: "Get-PrintJob -PrinterName \"Office Printer 04\"",
        output: "Queue status: Paused · Job 1842: Waiting",
        meaning: "This is the first failed layer. The queue is paused and the waiting job is blocking progress.",
        pass: false,
        fix: "Resume the print queue, remove the stuck job, and submit a test page."
      },
      {
        title: "Does a test page print?",
        desc: "Verify the fix with a small, controlled print job.",
        command: "Print test page",
        output: "Test page sent · Status: Printed",
        meaning: "The printer is working again. Document the fix and explain it to the user.",
        pass: true,
        fix: "Check the printer driver and service logs if the test page still fails."
      }
    ]
  }
};

let activeScenario = "internet";
let current = 0;
let answered = 0;

const $ = id => document.getElementById(id);

function render() {
  const scenario = scenarios[activeScenario];
  const check = scenario.checks[current];

  $("scenarioTitle").textContent = scenario.title;
  $("scenarioContext").innerHTML = scenario.context;

  $("stepNumber").textContent =
    String(current + 1).padStart(2, "0");

  $("stepStatus").textContent =
    `CHECK ${current + 1} OF ${scenario.checks.length}`;

  document.querySelector(".step-count .muted").textContent =
    String(scenario.checks.length).padStart(2, "0");

  $("checkTitle").textContent = check.title;
  $("checkDescription").textContent = check.desc;
  $("checkCommand").textContent = check.command;

  $("stepLineFill").style.width =
    `${((current + 1) / scenario.checks.length) * 100}%`;

  $("evidencePanel").classList.add("hidden");

  $("completeTitle").textContent = scenario.completeTitle;
  $("completeMessage").textContent = scenario.completeMessage;
  $("summarySymptom").textContent = scenario.symptom;
  $("summaryCause").textContent = scenario.cause;
  $("summaryFix").textContent = scenario.fix;

  document.querySelectorAll(".layer").forEach((layer, index) => {
    layer.classList.toggle(
      "active-layer",
      index === Math.min(2, Math.floor(current / 2))
    );
  });
}

function showEvidence(isCorrect) {
  const check = scenarios[activeScenario].checks[current];
  const nextStep = current < scenarios[activeScenario].checks.length - 1
    ? `Next logical step: ${scenarios[activeScenario].checks[current + 1].title}`
    : "Next logical step: document the evidence and close the ticket.";

  $("evidencePanel").classList.remove("hidden");

  $("evidencePanel").classList.toggle(
    "evidence-fail",
    !isCorrect
  );

  $("evidenceTitle").textContent = isCorrect
    ? "Observed result"
    : "This result points to the cause";

  $("evidenceStatus").textContent = isCorrect
    ? "The check passed"
    : "The check failed here";

  $("evidenceOutput").textContent =
    `${check.command}\n${check.output}`;

  $("evidenceMeaning").textContent = isCorrect
    ? `${check.meaning} ${nextStep}`
    : `${check.meaning} Suggested fix: ${check.fix} ${nextStep}`;

  $("continueBtn").textContent = isCorrect
    ? "Continue to next check →"
    : "Apply fix and retest →";

  $("continueBtn").dataset.mode = isCorrect
    ? "continue"
    : "fix";
}

document.querySelectorAll(".answer-btn").forEach(button => {
  button.addEventListener("click", () => {
    const selectedPass =
      button.dataset.answer === "pass";

    const expectedPass =
      scenarios[activeScenario].checks[current].pass;

    showEvidence(selectedPass === expectedPass);
  });
});

$("continueBtn").addEventListener("click", () => {
  const scenario = scenarios[activeScenario];

  if ($("continueBtn").dataset.mode === "fix") {
    showToast("Fix applied — retesting the problem");
  }

  answered = Math.max(answered, current + 1);

  $("progressPercent").textContent =
    `${Math.round(((6 + answered) / 25) * 100)}%`;

  if (current < scenario.checks.length - 1) {
    current++;
    render();
  } else {
    $("labView").classList.add("hidden");
    $("completePanel").classList.remove("hidden");
    showToast("Scenario complete — nice work.");
  }
});

$("copyBtn").addEventListener("click", () => {
  navigator.clipboard?.writeText(
    $("checkCommand").textContent
  );

  showToast("Command copied");
});

function resetCase() {
  current = 0;
  answered = 0;

  $("progressPercent").textContent = "24%";
  $("completePanel").classList.add("hidden");
  $("labView").classList.remove("hidden");

  render();
  showToast("Scenario reset");
}

function openScenario(name) {
  activeScenario = name;
  current = 0;
  answered = 0;

  $("libraryView").classList.add("hidden");
  $("labView").classList.remove("hidden");
  $("completePanel").classList.add("hidden");

  document.querySelectorAll(".nav-item").forEach(nav => {
    nav.classList.toggle(
      "active",
      nav.dataset.view === "library"
    );
  });

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  showToast(`${scenarios[name].title} ready`);
}

$("resetBtn").addEventListener("click", resetCase);
$("restartBtn").addEventListener("click", resetCase);

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(nav => {
      nav.classList.remove("active");
    });

    item.classList.add("active");

    const view = item.dataset.view;

    $("libraryView").classList.toggle(
      "hidden",
      view !== "library"
    );

    $("labView").classList.toggle(
      "hidden",
      view !== "lab"
    );

    $("completePanel").classList.add("hidden");

    $("conceptsView").classList.toggle(
      "hidden",
      view !== "concepts"
    );

    $("commandsView").classList.toggle(
      "hidden",
      view !== "commands"
    );
  });
});

document.querySelectorAll(".problem-card").forEach(card => {
  card.addEventListener("click", () => {
    const name = card.dataset.scenario;

    if (!scenarios[name]) {
      showToast("That scenario is coming next.");
      return;
    }

    openScenario(name);
  });
});

document.querySelectorAll(".category-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const category = chip.dataset.category;

    document.querySelectorAll(".category-chip").forEach(item => {
      const isActive = item === chip;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    document.querySelectorAll(".problem-card").forEach(card => {
      const showCard = category === "all" || card.dataset.category === category;
      card.classList.toggle("hidden", !showCard);
    });
  });
});

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

const themeToggle = $("themeToggle");

function applyTheme(isDark) {
  document.body.classList.toggle("dark-mode", isDark);

  themeToggle.querySelector(".theme-icon").textContent =
    isDark ? "☀" : "☾";

  themeToggle.querySelector(".theme-label").textContent =
    isDark ? "Light mode" : "Dark mode";
}

applyTheme(
  localStorage.getItem("packetpath-theme") === "dark"
);

themeToggle.addEventListener("click", () => {
  const isDark =
    !document.body.classList.contains("dark-mode");

  applyTheme(isDark);

  localStorage.setItem(
    "packetpath-theme",
    isDark ? "dark" : "light"
  );
});

render();
