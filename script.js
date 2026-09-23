"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const defaultStats = {
  matches: 0,
  wins: 0,
  losses: 0,
  best: 0,
  boundaries: 0,
};
let stats = loadStats();
let settings = { mode: "cpu", difficulty: "easy", wickets: 3, overs: 0 };
let game = null;
const screens = {
  setup: $("#setupScreen"),
  toss: $("#tossScreen"),
  game: $("#gameScreen"),
  result: $("#resultScreen"),
};
function loadStats() {
  try {
    return {
      ...defaultStats,
      ...JSON.parse(localStorage.getItem("handCricketStats") || "{}"),
    };
  } catch {
    return { ...defaultStats };
  }
}
function saveStats() {
  localStorage.setItem("handCricketStats", JSON.stringify(stats));
}
function show(name) {
  Object.entries(screens).forEach(([key, el]) => (el.hidden = key !== name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function selectGroup(selector, attr, callback) {
  $$(selector).forEach((btn) =>
    btn.addEventListener("click", () => {
      $$(selector).forEach((x) => x.classList.remove("selected"));
      btn.classList.add("selected");
      callback(btn.dataset[attr]);
    }),
  );
}
selectGroup("#modeOptions .option", "mode", (v) => {
  settings.mode = v;
  $("#difficultyBox").hidden = v === "local";
  $("#playerTwoNameField").hidden = v !== "local";
  $("#playerOneName").previousElementSibling.textContent =
    v === "local" ? "Player 1 name" : "Your name";
  $("#modeSummary").textContent = v === "cpu" ? "vs CPU" : "pass & play";
});
selectGroup(
  "#difficultyOptions .option",
  "difficulty",
  (v) => (settings.difficulty = v),
);
selectGroup(
  "#wicketOptions .option",
  "wickets",
  (v) => (settings.wickets = Number(v)),
);
selectGroup("#overOptions .option", "overs", (v) => {
  settings.overs = Number(v);
  $("#oversSummary").textContent = settings.overs
    ? settings.overs + " over" + (settings.overs > 1 ? "s" : "")
    : "Unlimited";
});
$("#startBtn").addEventListener("click", startMatch);
$("#quitBtn").addEventListener("click", quitMatch);
$("#statsBtn").addEventListener("click", openStats);
$("#closeStats").addEventListener(
  "click",
  () => ($("#statsDrawer").hidden = true),
);
$("#resetStats").addEventListener("click", () => {
  stats = { ...defaultStats };
  saveStats();
  renderStats();
});
function startMatch() {
  const playerOneName = $("#playerOneName").value.trim() || "Player 1";
  const playerTwoName = $("#playerTwoName").value.trim() || "Player 2";
  game = {
    innings: 1,
    batTeam: null,
    bowlTeam: null,
    teams: {
      p1: { name: playerOneName, score: 0, wickets: 0, balls: 0 },
      p2: {
        name: settings.mode === "cpu" ? "CPU" : playerTwoName,
        score: 0,
        wickets: 0,
        balls: 0,
      },
    },
    target: null,
    feed: [],
    chips: [],
    recentMoves: [],
    waitingPass: false,
  };
  show("toss");
  resetToss();
}
function resetToss() {
  $$(".choice").forEach((b) => b.classList.remove("selected"));
  $("#coin").innerHTML = '<span class="coin-face">HC</span>';
  $("#coin").setAttribute("aria-label", "Coin ready to flip");
  $("#coin").classList.remove("flip");
  $("#tossMessage").textContent = "Heads or tails?";
  $("#flipBtn").disabled = true;
  $("#flipBtn").hidden = false;
  $("#tossDecision").hidden = true;
  $("#coinChoices").hidden = false;
}
$$("#coinChoices .choice").forEach((btn) =>
  btn.addEventListener("click", () => {
    $$("#coinChoices .choice").forEach((x) => x.classList.remove("selected"));
    btn.classList.add("selected");
    $("#flipBtn").disabled = false;
    game.call = btn.dataset.call;
  }),
);
$("#flipBtn").addEventListener("click", () => {
  const result = Math.random() < 0.5 ? "Heads" : "Tails";
  const won = result === game.call;
  game.tossWinner = won ? "p1" : "p2";
  $("#coin").classList.remove("flip");
  void $("#coin").offsetWidth;
  $("#coin").classList.add("flip");
  $("#coin").innerHTML = `<span class="coin-face">${result[0]}</span>`;
  $("#coin").setAttribute("aria-label", `${result} coin result`);
  $("#tossMessage").textContent =
    `${result}. ${won ? "You win" : "CPU wins"} the toss.`;
  $("#flipBtn").hidden = true;
  $("#coinChoices").hidden = true;
  $("#tossDecision").hidden = false;
  $("#decisionText").textContent = won
    ? "Choose how you want to start."
    : "The computer is choosing a balanced start.";
  if (!won) {
    setTimeout(() => beginInnings(Math.random() < 0.5 ? "bat" : "bowl"), 700);
  }
});
$$("#tossDecision [data-decision]").forEach((btn) =>
  btn.addEventListener("click", () => beginInnings(btn.dataset.decision)),
);
function beginInnings(decision) {
  if (game.started) return;
  game.started = true;
  const winner = game.tossWinner;
  const winnerBats = winner === "p1" ? decision === "bat" : decision === "bowl";
  game.batTeam = winnerBats ? "p1" : "p2";
  game.bowlTeam = game.batTeam === "p1" ? "p2" : "p1";
  renderGame();
  show("game");
}
function renderGame() {
  const bat = game.teams[game.batTeam],
    bowl = game.teams[game.bowlTeam];
  $("#inningsLabel").textContent =
    game.innings === 1 ? "First innings" : "Second innings";
  $("#gameTitle").textContent = `${bat.name} batting`;
  $("#teamAName").textContent = game.teams.p1.name;
  $("#teamBName").textContent = game.teams.p2.name;
  $("#teamAScore").textContent = game.teams.p1.score;
  $("#teamAWickets").textContent = game.teams.p1.wickets;
  $("#teamBScore").textContent = game.teams.p2.score;
  $("#teamBWickets").textContent = game.teams.p2.wickets;
  $("#teamA").classList.toggle("active", game.batTeam === "p1");
  $("#teamB").classList.toggle("active", game.batTeam === "p2");
  $("#gameOvers").textContent = settings.overs
    ? settings.overs + ".0"
    : "Unlimited";
  $("#targetLine").textContent = game.target
    ? `Target ${game.target} - ${Math.max(0, game.target - bat.score)} runs needed`
    : "First innings - set a total";
  $("#ribbonInnings").textContent =
    game.innings === 1 ? "First innings" : "Second innings";
  $("#ribbonBatting").textContent = `${bat.name} batting`;
  $("#ribbonState").textContent = game.target
    ? `${Math.max(0, game.target - bat.score)} runs to win`
    : "Set your total";
  $("#turnPrompt").textContent =
    settings.mode === "local"
      ? game.waitingPass
        ? "Player 2, choose your number"
        : "Player 1, choose your number"
      : "Choose your number";
  $("#ballCount").textContent = `${Math.floor(bat.balls / 6)}.${bat.balls % 6}`;
  $("#inningsBallText").textContent = `Ball ${bat.balls}`;
  $("#feed").innerHTML = game.feed
    .slice()
    .reverse()
    .map((x) => `<div class="feed-line">${x}</div>`)
    .join("");
  $("#chips").innerHTML = game.chips
    .map((x) => `<span class="chip ${x.class}">${x.text}</span>`)
    .join("");
  renderKeypad();
}
function renderKeypad() {
  if (game.waitingPass) {
    $("#keypad").hidden = true;
    $("#maskPanel").hidden = false;
    return;
  }
  $("#keypad").hidden = false;
  $("#maskPanel").hidden = true;
  $("#keypad").innerHTML = [1, 2, 3, 4, 5, 6]
    .map((n) => `<button class="key" data-move="${n}">${n}</button>`)
    .join("");
  $$("#keypad .key").forEach((btn) =>
    btn.addEventListener("click", () => chooseMove(Number(btn.dataset.move))),
  );
}
$("#passBtn").addEventListener("click", () => {
  game.waitingPass = false;
  renderGame();
});
function chooseMove(userMove) {
  if (game.animating) return;
  const batter = game.batTeam === "p1" ? "p1" : "p2";
  let batterMove = userMove,
    bowlerMove;
  if (settings.mode === "cpu") {
    bowlerMove = cpuMove();
    if (game.batTeam === "p2")
      ((batterMove = bowlerMove), (bowlerMove = userMove));
  } else if (settings.mode === "local") {
    if (game.pending == null) {
      game.pending = userMove;
      game.waitingPass = true;
      renderGame();
      return;
    }
    const playerOneMove = game.pending;
    const playerTwoMove = userMove;
    game.pending = null;
    game.waitingPass = false;
    batterMove = game.batTeam === "p1" ? playerOneMove : playerTwoMove;
    bowlerMove = game.batTeam === "p1" ? playerTwoMove : playerOneMove;
  }
  playBall(batterMove, bowlerMove, batter);
}
function cpuMove() {
  const isBowling = game.bowlTeam === "p2";
  if (settings.difficulty === "easy") return rand();
  if (
    settings.difficulty === "medium" &&
    isBowling &&
    game.recentMoves.length
  ) {
    const freq = {};
    game.recentMoves.forEach((n) => (freq[n] = (freq[n] || 0) + 1));
    const common = Number(
      Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0],
    );
    return Math.random() < 0.55 ? common : rand();
  }
  if (settings.difficulty === "hard") {
    const bat = game.teams[game.batTeam],
      needed = game.target ? game.target - bat.score : 0;
    const ballsLeft = settings.overs ? settings.overs * 6 - bat.balls : 99;
    const aggressive =
      game.innings === 2 &&
      needed > 0 &&
      needed / Math.max(1, ballsLeft) > 0.75;
    if (isBowling)
      return aggressive
        ? Math.random() < 0.65
          ? 6
          : 4
        : Math.random() < 0.65
          ? randRange(1, 3)
          : rand();
    return aggressive
      ? Math.random() < 0.6
        ? randRange(4, 6)
        : randRange(1, 2)
      : rand();
  }
  return rand();
}
const rand = () => Math.floor(Math.random() * 6) + 1;
const randRange = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function animateDelivery(out, batterMove) {
  const overlay = $("#deliveryOverlay");
  const card = $("#deliveryCard");
  const punchValue = $(".score-punch-value");
  const number = $("#deliveryNumber");
  const sequence = [6, 5, 4, 1, 2, 3];
  card.className = "delivery-card";
  punchValue.textContent = batterMove;
  overlay.hidden = false;
  for (const value of sequence) {
    number.className = "delivery-number";
    number.textContent = value;
    void number.offsetWidth;
    number.style.animation = "none";
    void number.offsetWidth;
    number.style.animation = "delivery-pop 0.18s ease both";
    await wait(180);
  }
  if (out) {
    card.classList.add("out");
    number.className = "delivery-number out";
    number.textContent = "OUT";
  } else if (batterMove === 4 || batterMove === 6) {
    card.classList.add(batterMove === 4 ? "four" : "six");
    number.className = "delivery-number";
    number.textContent = "";
  } else {
    number.className = "delivery-number";
    number.textContent = `${batterMove} RUNS`;
  }
  await wait(520);
  overlay.hidden = true;
}
async function playBall(batterMove, bowlerMove, batter) {
  if (game.animating) return;
  game.animating = true;
  const bat = game.teams[game.batTeam],
    bowl = game.teams[game.bowlTeam];
  bat.balls++;
  game.recentMoves.push(batterMove);
  if (game.recentMoves.length > 8) game.recentMoves.shift();
  const out = batterMove === bowlerMove;
  await animateDelivery(out, batterMove);
  document.body.classList.remove("flash-boundary", "flash-out");
  void document.body.offsetWidth;
  if (out || batterMove === 4 || batterMove === 6) {
    document.body.classList.add(out ? "flash-out" : "flash-boundary");
    setTimeout(
      () => document.body.classList.remove("flash-boundary", "flash-out"),
      560,
    );
  }
  let text;
  if (out) {
    bat.wickets++;
    game.chips.push({ text: "W", class: "wicket" });
    text = `${bat.name} is OUT! Both played ${batterMove}.`;
    sound("wicket");
    navigator.vibrate?.([80, 40, 120]);
  } else {
    bat.score += batterMove;
    const cls =
      batterMove === 4 ? "boundary4" : batterMove === 6 ? "boundary6" : "";
    game.chips.push({ text: batterMove, class: cls });
    text = `${bat.name} scored ${batterMove} run${batterMove === 1 ? "" : "s"}! ${bowl.name} bowled ${bowlerMove}.`;
    sound(batterMove === 6 ? "six" : batterMove === 4 ? "four" : "run");
    if (batterMove === 4 || batterMove === 6) stats.boundaries++;
  }
  game.feed.push(
    `<b>${Math.floor((bat.balls - 1) / 6)}.${(bat.balls - 1) % 6}</b> - ${text}`,
  );
  saveStats();
  renderGame();
  if (game.innings === 2 && bat.score >= game.target) {
    finish(game.batTeam, "chase");
    return;
  }
  if (
    bat.wickets >= settings.wickets ||
    (settings.overs && bat.balls >= settings.overs * 6)
  ) {
    if (game.innings === 1) {
      game.target = bat.score + 1;
      game.innings = 2;
      [game.batTeam, game.bowlTeam] = [game.bowlTeam, game.batTeam];
      game.chips = [];
      game.feed.push(`<b>Innings break</b> - Target set at ${game.target}.`);
      game.waitingPass = false;
      renderGame();
    } else
      finish(bat.score === game.target - 1 ? "tie" : game.bowlTeam, "defense");
  }
  game.animating = false;
}
function finish(winner, reason) {
  const p1 = game.teams.p1,
    p2 = game.teams.p2;
  const userWon = winner === "p1";
  stats.matches++;
  if (settings.mode === "cpu") {
    userWon ? stats.wins++ : stats.losses++;
  }
  const userScore = p1.score;
  stats.best = Math.max(stats.best, userScore);
  saveStats();
  game.winner = winner;
  game.reason = reason;
  sound("win");
  navigator.vibrate?.([100, 50, 100, 50, 220]);
  renderResult();
  show("result");
}
function quitMatch() {
  if (!game || game.animating || game.winner) return;
  const quitter = settings.mode === "local" && game.waitingPass ? "p2" : "p1";
  const winner = quitter === "p1" ? "p2" : "p1";
  finish(winner, "quit");
}
function renderResult() {
  const p1 = game.teams.p1,
    p2 = game.teams.p2;
  const tie = game.winner === "tie";
  $("#resultTitle").textContent = tie
    ? "It is a tie."
    : game.winner === "p1"
      ? "You win!"
      : settings.mode === "local"
        ? "Player 2 wins."
        : "CPU wins.";
  $("#resultSub").textContent = tie
    ? "Perfectly even."
    : game.reason === "quit"
      ? `${game.teams[game.winner].name} wins because the match was conceded.`
      : game.reason === "chase"
        ? `${game.teams[game.winner].name} chased it down.`
        : `${game.teams[game.winner].name} defended the total.`;
  $("#resultTeamAName").textContent = p1.name;
  $("#resultTeamBName").textContent = p2.name;
  $("#resultScoreA").textContent = `${p1.score} / ${p1.wickets}`;
  $("#resultScoreB").textContent = `${p2.score} / ${p2.wickets}`;
  $("#resultMargin").textContent = tie
    ? "Tie"
    : `${game.teams[game.winner].name} wins`;
  $("#resultOvers").textContent = settings.overs
    ? `${settings.overs} over match`
    : "Unlimited overs";
  renderStats();
}
$("#replayBtn").addEventListener("click", () => {
  game = null;
  show("setup");
});
function renderStats() {
  const rows = [
    ["Matches played", stats.matches],
    ["Wins vs CPU", stats.wins],
    ["Losses vs CPU", stats.losses],
    ["Highest score", stats.best],
    ["Boundaries", stats.boundaries],
  ];
  $("#statsContent").innerHTML = rows
    .map(
      (r) =>
        `<div class="stat-card"><span>${r[0]}</span><strong>${r[1]}</strong></div>`,
    )
    .join("");
  $("#resultMatches").textContent = stats.matches;
  $("#resultWins").textContent = stats.wins;
  $("#resultLosses").textContent = stats.losses;
  $("#resultBest").textContent = stats.best;
  $("#resultBoundaries").textContent = stats.boundaries;
}
function openStats() {
  renderStats();
  $("#statsDrawer").hidden = false;
}
let audio;
function sound(type) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const now = audio.currentTime;
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    const base =
      type === "wicket"
        ? 100
        : type === "win"
          ? 420
          : type === "six"
            ? 360
            : type === "four"
              ? 520
              : 260;
    const peak =
      type === "six"
        ? 1100
        : type === "four"
          ? 820
          : type === "wicket"
            ? 55
            : base * 1.8;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(peak, now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(
      type === "win" ? 0.12 : 0.06,
      now + 0.015,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.23);
  } catch {}
}
renderStats();
