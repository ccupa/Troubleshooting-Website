const checks = [
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
        desc: "Use a known public IP to separate routing problems from DNS problems. This test does not need a hostname.",
        command: "ping 1.1.1.1",
        output: "Reply from 1.1.1.1: bytes=32 time=18ms",
        meaning: "Internet routing works. If websites still fail, name resolution is the likely layer.",
        pass: true,
        fix: "Verify the router’s WAN status and firewall policy."
    },
    {
        title: "Can DNS resolve a hostname?",
        desc: "Now test the translation from a name to an IP address. This is the check that makes “websites won’t load” concrete.",
        command: "nslookup example.com",
        output: "DNS request timed out. Server: 192.168.1.99",
        meaning: "This is the first failed layer. The configured DNS server is not responding, so names cannot become addresses.",
        pass: false,
        fix: "Change the DNS server to a working internal or public resolver, then test again."
    },
    {
        title: "Does the service itself respond?",
        desc: "The network may be healthy even when one website or application is down. Test the specific destination and port.",
        command: "curl -I https://example.com",
        output: "HTTP/2 200 OK",
        meaning: "The service responds after the DNS fix. Document the evidence and close the ticket.",
        pass: true,
        fix: "Check service status and proxy or firewall logs."
    }
];

let current = 0;
let answered = 0;

const $ = id => document.getElementById(id);

function render() {
    const check = checks[current];

    $("stepNumber").textContent = String(current + 1).padStart(2, "0");
    $("stepStatus").textContent = `CHECK ${current + 1} OF ${checks.length}`;
    $("checkTitle").textContent = check.title;
    $("checkDescription").textContent = check.desc;
    $("checkCommand").textContent = check.command;
    $("stepLineFill").style.width =
        `${((current + 1) / checks.length) * 100}%`;

    $("evidencePanel").classList.add("hidden");

    document.querySelectorAll(".layer").forEach((layer, index) => {
        layer.classList.toggle(
            "active-layer",
            index === Math.min(2, Math.floor(current / 2))
        );
    });
}

function showEvidence(isCorrect) {
    const check = checks[current];

    $("evidencePanel").classList.remove("hidden");
    $("evidencePanel").classList.toggle("evidence-fail", !isCorrect);

    $("evidenceTitle").textContent = isCorrect
        ? "Observed result"
        : "This result points to the cause";

    $("evidenceStatus").textContent = isCorrect
        ? "The check passed"
        : "The check failed here";

    $("evidenceOutput").textContent =
        `${check.command}\n${check.output}`;

    $("evidenceMeaning").textContent = isCorrect
        ? check.meaning
        : `${check.meaning} Suggested fix: ${check.fix}`;

    $("continueBtn").textContent = isCorrect
        ? "Continue to next check →"
        : "Apply fix and retest →";

    $("continueBtn").dataset.mode = isCorrect
        ? "continue"
        : "fix";
}

document.querySelectorAll(".answer-btn").forEach(button => {
    button.addEventListener("click", () => {
        const selectedPass = button.dataset.answer === "pass";
        const expectedPass = checks[current].pass;

        showEvidence(selectedPass === expectedPass);
    });
});

$("continueBtn").addEventListener("click", () => {
    const mode = $("continueBtn").dataset.mode;

    if (mode === "fix") {
        showToast("Fix applied — retesting the connection");
    }

    answered = Math.max(answered, current + 1);

    $("progressPercent").textContent =
        `${Math.round(((6 + answered) / 25) * 100)}%`;

    if (current < checks.length - 1) {
        current++;
        render();
    } else {
        $("labView").classList.add("hidden");
        $("completePanel").classList.remove("hidden");
        showToast("Case complete — nice work.");
    }
});

$("copyBtn").addEventListener("click", () => {
    navigator.clipboard?.writeText($("checkCommand").textContent);
    showToast("Command copied");
});

function resetCase() {
    current = 0;
    answered = 0;

    $("progressPercent").textContent = "24%";
    $("completePanel").classList.add("hidden");
    $("labView").classList.remove("hidden");

    render();
    showToast("Case reset");
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

        $("labView").classList.toggle("hidden", view !== "lab");
        $("completePanel").classList.add("hidden");
        $("conceptsView").classList.toggle("hidden", view !== "concepts");
        $("commandsView").classList.toggle("hidden", view !== "commands");
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

applyTheme(localStorage.getItem("packetpath-theme") === "dark");

themeToggle.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark-mode");

    applyTheme(isDark);

    localStorage.setItem(
        "packetpath-theme",
        isDark ? "dark" : "light"
    );
});

render();