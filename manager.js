// GAFFER'S LEAGUE - FOOTBALL MANAGER 2026 LOGIC

// Safe localStorage wrapper to prevent exceptions under strict security policies (e.g. file://)
const safeStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn("Storage access denied:", e);
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn("Storage access denied:", e);
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn("Storage access denied:", e);
        }
    }
};

// ==========================================
// CONSTANTS & DATABASES
// ==========================================
const SQUAD_MAX_SIZE = 22;
const BASE_TICKET_PRICE = 30; // Dollar per ticket

const FIRST_NAMES = ["Ahmad", "Bambang", "Christian", "David", "Eko", "Fajar", "Gede", "Hendra", "Iwan", "Joko", "Kevin", "Leo", "Muhammad", "Naufal", "Oki", "Pratama", "Rizky", "Setiawan", "Taufik", "Utomo", "Victor", "Wahyu", "Yudi", "Zacky", "Marcus", "Lucas", "Diego", "Carlos", "John", "Harry", "Sandro", "Fabio", "Karim"];
const LAST_NAMES = ["Wijaya", "Susanto", "Saputra", "Kusuma", "Hidayat", "Siregar", "Ginting", "Nasution", "Lubis", "Nugroho", "Kurniawan", "Wibowo", "Ramadhan", "Santoso", "Prasetyo", "Silva", "Santos", "Smith", "Johnson", "Mendes", "Fernandez", "Gomez", "Kane", "Haaland", "Mbappe", "Bellingham"];

const TEAM_NAMES = [
    { name: "Jakarta Wolves", rating: 83, jersey: "JW" },
    { name: "Bandung Tigers", rating: 81, jersey: "BT" },
    { name: "Surabaya Sharks", rating: 79, jersey: "SS" },
    { name: "Bali Dragons", rating: 82, jersey: "BD" },
    { name: "Makassar Eagles", rating: 76, jersey: "ME" },
    { name: "Medan Pythons", rating: 72, jersey: "MP" },
    { name: "Solo Knights", rating: 74, jersey: "SK" },
    { name: "Semarang Hawks", rating: 77, jersey: "SH" },
    { name: "Samarinda Dolphins", rating: 84, jersey: "SD" },
    { name: "Malang Lions", rating: 80, jersey: "ML" },
    { name: "Kediri Crocs", rating: 71, jersey: "KC" },
    { name: "Tangerang Vipers", rating: 73, jersey: "TV" },
    { name: "Yogyakarta Owls", rating: 75, jersey: "YO" },
    { name: "Madura Bulls", rating: 78, jersey: "MB" },
    { name: "Palembang Giants", rating: 74, jersey: "PG" }
];

const STADIUM_UPGRADES = [
    { level: 1, capacity: 15000, cost: 0, maintenance: 80000 },
    { level: 2, capacity: 25000, cost: 4000000, maintenance: 120000 },
    { level: 3, capacity: 40000, cost: 8000000, maintenance: 180000 },
    { level: 4, capacity: 60000, cost: 15000000, maintenance: 250000 }
];

const TRAINING_UPGRADES = [
    { level: 1, name: "Amatir", cost: 0, boost: 0.05, maintenance: 20000 },
    { level: 2, name: "Semi-Pro", cost: 2500000, boost: 0.10, maintenance: 45000 },
    { level: 3, name: "Profesional", cost: 6000000, boost: 0.18, maintenance: 80000 },
    { level: 4, name: "Kelas Dunia", cost: 12000000, boost: 0.28, maintenance: 150000 }
];

const YOUTH_UPGRADES = [
    { level: 1, name: "Dasar", cost: 0, interval: 8, minRating: 50, maxRating: 65 },
    { level: 2, name: "Menengah", cost: 3000000, interval: 6, minRating: 58, maxRating: 73 },
    { level: 3, name: "Elite", cost: 7000000, interval: 5, minRating: 65, maxRating: 80 },
    { level: 4, name: "Akademi Emas", cost: 14000000, interval: 4, minRating: 72, maxRating: 87 }
];

// ==========================================
// GAME STATE
// ==========================================
let gameState = {
    managerName: "Coach Gaffer",
    teamName: "Garuda United",
    difficulty: "medium",
    week: 1,
    balance: 20000000,
    rank: 8,
    stadiumLevel: 1,
    trainingLevel: 1,
    youthLevel: 1,
    youthProgress: 0,
    squad: [],
    teams: [],
    schedule: [],
    marketPlayers: [],
    recentResults: [],
    inbox: [],
    tactic: {
        formation: "4-4-2",
        mentality: "balanced",
        captainId: null,
        penaltyId: null
    },
    financesHistory: {
        ticketRevenue: 0,
        sponsorRevenue: 0,
        merchandiseRevenue: 0,
        playerSales: 0,
        playerWages: 0,
        maintenanceCosts: 0,
        playerPurchases: 0
    }
};

// ==========================================
// SOUND SYNTHESIS ENGINE (Web Audio API)
// ==========================================
let audioCtx = null;
let soundMuted = false;
let crowdGainNode = null;
let crowdBuffer = null;

function initAudio() {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        
        // Create brown/white noise buffer for stadium background crowd
        const bufferSize = audioCtx.sampleRate * 4; // 4 seconds of loop
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Brown noise generation for a deeper crowd rumble
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // amplification
        }
        crowdBuffer = buffer;
        
        // Setup crowd gain
        crowdGainNode = audioCtx.createGain();
        crowdGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        crowdGainNode.connect(audioCtx.destination);
    } catch (e) {
        console.error("Audio API not supported in this browser", e);
    }
}

function startCrowdSound() {
    if (soundMuted || !audioCtx || !crowdBuffer) return;
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        // Source
        const crowdSource = audioCtx.createBufferSource();
        crowdSource.buffer = crowdBuffer;
        crowdSource.loop = true;
        
        // Lowpass filter to make it sound like a stadium crowd
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, audioCtx.currentTime);
        
        crowdSource.connect(filter);
        filter.connect(crowdGainNode);
        
        crowdSource.start();
        // Fade in crowd sound to a gentle hum
        crowdGainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 2);
    } catch (e) {
        console.warn(e);
    }
}

function stopCrowdSound() {
    if (!crowdGainNode) return;
    try {
        crowdGainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
    } catch (e) {
        console.warn(e);
    }
}

function setCrowdIntensity(level) {
    if (soundMuted || !crowdGainNode || !audioCtx) return;
    // level: 0 (hum), 1 (excitement), 2 (goal celebration)
    const targetGain = level === 2 ? 0.35 : (level === 1 ? 0.18 : 0.08);
    const targetFreq = level === 2 ? 800 : (level === 1 ? 600 : 450);
    
    try {
        crowdGainNode.gain.linearRampToValueAtTime(targetGain, audioCtx.currentTime + 0.8);
    } catch (e) {
        console.warn(e);
    }
}

function playRefereeWhistle(type) {
    if (soundMuted || !audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // High pitch whistle
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        
        if (type === 'short') {
            // Short whistle (foul / kick off)
            gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
        } else if (type === 'double') {
            // Double short whistle
            gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
            
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1200, audioCtx.currentTime);
            gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.22);
            gain2.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.27);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.22);
            osc2.start(audioCtx.currentTime + 0.22);
            osc2.stop(audioCtx.currentTime + 0.48);
        } else {
            // Long whistle (Full time)
            gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.1);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 1.15);
        }
    } catch(e) {}
}

// ==========================================
// UTILITY ENGINE: NAMES, INITIAL GENERATORS
// ==========================================
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generatePlayerName() {
    return getRandomElement(FIRST_NAMES) + " " + getRandomElement(LAST_NAMES);
}

function calculatePlayerValue(rating, age) {
    // Value goes up exponentially with rating, declines slightly with age > 29
    let base = Math.pow(rating - 35, 2.5) * 8000;
    if (age > 29) {
        base *= (1 - (age - 29) * 0.07); // decline
    } else if (age < 22) {
        base *= 1.2; // premium for young players with potential
    }
    return Math.max(100000, Math.round(base / 50000) * 50000);
}

function calculatePlayerSalary(rating) {
    let base = Math.pow(rating - 30, 2) * 80;
    return Math.max(500, Math.round(base / 100) * 100);
}

function generatePlayer(pos = null, minRat = 50, maxRat = 85) {
    const positions = ["GK", "DF", "MF", "FW"];
    const playerPos = pos || getRandomElement(positions);
    const age = randomRange(16, 34);
    const rating = randomRange(minRat, maxRat);
    const value = calculatePlayerValue(rating, age);
    const salary = calculatePlayerSalary(rating);
    
    return {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name: generatePlayerName(),
        age: age,
        position: playerPos,
        rating: rating,
        energy: 100,
        form: randomRange(3, 5),
        value: value,
        salary: salary,
        suspended: false,
        injured: 0,
        stats: { goals: 0, assists: 0, matches: 0 }
    };
}

// ==========================================
// SCHEDULING ALGORITHM (Round-Robin)
// ==========================================
function generateLeagueSchedule() {
    const listTeams = [...gameState.teams];
    const N = listTeams.length;
    const totalRounds = N - 1; // 15 rounds
    const matchesPerRound = N / 2; // 8 matches
    
    let rounds = [];
    
    // Circle Method for round robin scheduling
    for (let r = 0; r < totalRounds; r++) {
        let roundMatches = [];
        for (let i = 0; i < matchesPerRound; i++) {
            let home = (r + i) % (N - 1);
            let away = (N - 1 - i + r) % (N - 1);
            if (i === 0) {
                home = N - 1;
            }
            roundMatches.push({
                homeTeam: listTeams[home].name,
                awayTeam: listTeams[away].name,
                homeScore: null,
                awayScore: null,
                played: false,
                scorers: [],
                assists: []
            });
        }
        rounds.push(roundMatches);
    }
    
    // Double Round-Robin (second half of the season swaps home/away)
    let doubleRounds = [];
    // Weeks 1-15 (First half)
    for (let r = 0; r < totalRounds; r++) {
        doubleRounds.push(rounds[r]);
    }
    // Weeks 16-30 (Second half)
    for (let r = 0; r < totalRounds; r++) {
        let swappedMatches = rounds[r].map(match => {
            return {
                homeTeam: match.awayTeam,
                awayTeam: match.homeTeam,
                homeScore: null,
                awayScore: null,
                played: false,
                scorers: [],
                assists: []
            };
        });
        doubleRounds.push(swappedMatches);
    }
    
    gameState.schedule = doubleRounds;
}

// ==========================================
// GAME SETUP & INIT
// ==========================================
function setupNewGame(manager, team, diff) {
    gameState.managerName = manager;
    gameState.teamName = team;
    gameState.difficulty = diff;
    gameState.week = 1;
    gameState.stadiumLevel = 1;
    gameState.trainingLevel = 1;
    gameState.youthLevel = 1;
    gameState.youthProgress = 0;
    gameState.recentResults = [];
    
    if (diff === "easy") {
        gameState.balance = 35000000;
    } else if (diff === "hard") {
        gameState.balance = 10000000;
    } else {
        gameState.balance = 20000000;
    }
    
    // Create AI teams
    gameState.teams = TEAM_NAMES.map(t => {
        return {
            name: t.name,
            rating: t.rating,
            jersey: t.jersey,
            played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
            isUser: false
        };
    });
    
    // Add user's team
    gameState.teams.push({
        name: team,
        rating: 72,
        jersey: team.split(' ').map(w => w[0]).join('').substr(0,3).toUpperCase(),
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
        isUser: true
    });
    
    // Generate schedule
    generateLeagueSchedule();
    
    // Generate initial user squad (18 players)
    // 2 GK, 6 DF, 6 MF, 4 FW
    gameState.squad = [];
    for(let i=0; i<2; i++) gameState.squad.push(generatePlayer("GK", 60, 75));
    for(let i=0; i<6; i++) gameState.squad.push(generatePlayer("DF", 60, 75));
    for(let i=0; i<6; i++) gameState.squad.push(generatePlayer("MF", 60, 75));
    for(let i=0; i<4; i++) gameState.squad.push(generatePlayer("FW", 60, 75));
    
    // Setup initial tactical selections
    gameState.tactic.formation = "4-4-2";
    gameState.tactic.mentality = "balanced";
    gameState.tactic.captainId = gameState.squad[2].id;
    gameState.tactic.penaltyId = gameState.squad[gameState.squad.length-1].id;
    
    // Setup initial mailbox
    gameState.inbox = [
        {
            id: 1,
            sender: "Direksi Klub",
            time: "Pekan 1",
            subject: "Selamat datang di " + team + "!",
            body: `Halo Manajer ${manager},\n\nSelamat atas penunjukan Anda sebagai manajer baru kami. Direksi klub mengharapkan Anda membawa tim ini bersaing di papan tengah pada musim perdana Anda.\n\nKeuangan klub diawali dengan saldo senilai $${formatMoney(gameState.balance)}. Pastikan Anda melakukan transfer pemain secara bijak untuk meningkatkan rating tim.\n\nSemoga beruntung!\n\nHormat kami,\nDirektur Klub.`,
            read: false
        }
    ];
    
    // Generate initial transfer market
    refreshTransferMarket(true);
    
    // Save game
    saveGame();
}

function loadOrSetupDefault() {
    const saved = safeStorage.getItem("gaffers_league_save");
    if (saved) {
        try {
            gameState = JSON.parse(saved);
            // Ensure compatibility fixes if needed
        } catch (e) {
            setupNewGame("Coach Gaffer", "Garuda United", "medium");
        }
    } else {
        setupNewGame("Coach Gaffer", "Garuda United", "medium");
    }
}

function saveGame() {
    safeStorage.setItem("gaffers_league_save", JSON.stringify(gameState));
}

// ==========================================
// TACTICS AND LINEUP CALCULATIONS
// ==========================================
function getStartingEleven() {
    // Return players that match the active formation
    // The formation dictates how many players per position are required.
    // 4-4-2: 1 GK, 4 DF, 4 MF, 2 FW
    // 4-3-3: 1 GK, 4 DF, 3 MF, 3 FW
    // 3-5-2: 1 GK, 3 DF, 5 MF, 2 FW
    // 5-4-1: 1 GK, 5 DF, 4 MF, 1 FW
    
    const form = gameState.tactic.formation;
    const req = { GK: 1, DF: 4, MF: 4, FW: 2 }; // default 4-4-2
    
    if (form === "4-3-3") { req.DF = 4; req.MF = 3; req.FW = 3; }
    else if (form === "3-5-2") { req.DF = 3; req.MF = 5; req.FW = 2; }
    else if (form === "5-4-1") { req.DF = 5; req.MF = 4; req.FW = 1; }
    
    let starters = [];
    let bench = [];
    
    // Filter out injured or suspended players
    const available = gameState.squad.filter(p => !p.suspended && p.injured === 0);
    const unavailable = gameState.squad.filter(p => p.suspended || p.injured > 0);
    
    // For each position, pick the highest rating available players
    const positions = ["GK", "DF", "MF", "FW"];
    let positionsPicked = { GK: 0, DF: 0, MF: 0, FW: 0 };
    
    // Sort available by rating descending
    const sortedAvailable = [...available].sort((a,b) => b.rating - a.rating);
    
    // First pass: fill required positions
    for (let pos of positions) {
        let needed = req[pos];
        let posPlayers = sortedAvailable.filter(p => p.position === pos);
        for (let i = 0; i < needed; i++) {
            if (posPlayers[i]) {
                starters.push(posPlayers[i]);
                positionsPicked[pos]++;
            }
        }
    }
    
    // If we couldn't fill the 11 due to lack of players in a specific position, fill with others
    let remainingStartersNeeded = 11 - starters.length;
    if (remainingStartersNeeded > 0) {
        const notPickedYet = sortedAvailable.filter(p => !starters.find(s => s.id === p.id));
        for (let i = 0; i < remainingStartersNeeded; i++) {
            if (notPickedYet[i]) {
                starters.push(notPickedYet[i]);
            }
        }
    }
    
    // Bench is all other players in the squad (both available and unavailable)
    bench = gameState.squad.filter(p => !starters.find(s => s.id === p.id));
    
    return { starters, bench };
}

function calculateTeamRatings() {
    const { starters } = getStartingEleven();
    if (starters.length === 0) return 40;
    
    const sum = starters.reduce((acc, p) => acc + p.rating, 0);
    const avg = sum / starters.length;
    
    // Update user team rating in the league database
    const userTeam = gameState.teams.find(t => t.isUser);
    if (userTeam) {
        userTeam.rating = Math.round(avg);
    }
    return avg;
}

// ==========================================
// BUDGET FORMATTING
// ==========================================
function formatMoney(num) {
    return "$" + num.toLocaleString('en-US');
}

// ==========================================
// IN-GAME TRANSFER MARKET Refresh
// ==========================================
function refreshTransferMarket(free = false) {
    if (!free) {
        if (gameState.balance < 100000) {
            alert("Saldo Anda tidak mencukupi untuk menyegarkan bursa transfer ($100,000)!");
            return;
        }
        gameState.balance -= 100000;
        gameState.financesHistory.playerPurchases += 100000;
    }
    
    gameState.marketPlayers = [];
    // Generate 8 random players of various ratings
    // Standard distribution: 1 GK, 2 DF, 3 MF, 2 FW
    // Ratings increase slightly as season progresses
    const progressBonus = Math.floor(gameState.week / 4);
    const min = Math.min(85, 45 + progressBonus);
    const max = Math.min(95, 80 + progressBonus);
    
    gameState.marketPlayers.push(generatePlayer("GK", min, max));
    gameState.marketPlayers.push(generatePlayer("DF", min, max));
    gameState.marketPlayers.push(generatePlayer("DF", min, max));
    gameState.marketPlayers.push(generatePlayer("MF", min, max));
    gameState.marketPlayers.push(generatePlayer("MF", min, max));
    gameState.marketPlayers.push(generatePlayer("MF", min, max));
    gameState.marketPlayers.push(generatePlayer("FW", min, max));
    gameState.marketPlayers.push(generatePlayer("FW", min, max));
    
    saveGame();
    if (!free) {
        updateUI();
    }
}

// ==========================================
// SIMULATION ENGINE: CORE MATCH CENTER
// ==========================================
let activeMatch = {
    userTeam: null,
    oppTeam: null,
    isHome: true,
    userGoals: 0,
    oppGoals: 0,
    minute: 0,
    timerId: null,
    speed: 1, // 1, 2, 3
    isMuted: false,
    stats: {
        user: { possession: 50, shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 },
        opp: { possession: 50, shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 }
    },
    scorers: [],
    commentary: [],
    // live squad during match (to track in-game cards/injuries)
    starters: [],
    bench: [],
    oppPlayers: [] // Generated for simulation
};

function generateOpponentRoster(teamRating) {
    // Generate simple opponent player names for match stats
    const roster = [];
    roster.push({ name: "GK " + getRandomElement(LAST_NAMES), rating: teamRating, position: "GK" });
    for(let i=0; i<4; i++) roster.push({ name: "DF " + getRandomElement(LAST_NAMES), rating: teamRating, position: "DF" });
    for(let i=0; i<4; i++) roster.push({ name: "MF " + getRandomElement(LAST_NAMES), rating: teamRating, position: "MF" });
    for(let i=0; i<2; i++) roster.push({ name: "FW " + getRandomElement(LAST_NAMES), rating: teamRating, position: "FW" });
    return roster;
}

function startMatchSimulation(opponentName, isHome) {
    const oppTeam = gameState.teams.find(t => t.name === opponentName);
    const userTeam = gameState.teams.find(t => t.isUser);
    
    const { starters, bench } = getStartingEleven();
    if (starters.length < 11) {
        alert("Skuad utama Anda memiliki kurang dari 11 pemain fit! Silakan atur kembali skuad Anda di tab Taktik.");
        return;
    }
    
    // Init Audio
    initAudio();
    
    activeMatch.userTeam = userTeam;
    activeMatch.oppTeam = oppTeam;
    activeMatch.isHome = isHome;
    activeMatch.userGoals = 0;
    activeMatch.oppGoals = 0;
    activeMatch.minute = 0;
    activeMatch.speed = 1;
    activeMatch.stats.user = { possession: 50, shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 };
    activeMatch.stats.opp = { possession: 50, shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 };
    activeMatch.scorers = [];
    activeMatch.commentary = [];
    
    // Copy current squad for match modifications (energy depletion, injuries, cards)
    activeMatch.starters = JSON.parse(JSON.stringify(starters));
    activeMatch.bench = JSON.parse(JSON.stringify(bench));
    activeMatch.oppPlayers = generateOpponentRoster(oppTeam.rating);
    
    // Update live Match tactics selector values
    document.getElementById("mc-mentality").value = gameState.tactic.mentality;
    
    // Update UI panels
    document.getElementById("mc-user-name").innerText = userTeam.name;
    document.getElementById("mc-opp-name").innerText = oppTeam.name;
    document.getElementById("mc-user-score").innerText = "0";
    document.getElementById("mc-opp-score").innerText = "0";
    document.getElementById("mc-time").innerText = "00:00";
    
    // Clear and show live comment lists
    const commentList = document.getElementById("mc-commentary-list");
    commentList.innerHTML = `<div class="comment-item comment-system">⚽ Peluit pertama berbunyi! Pertandingan antara ${userTeam.name} dan ${oppTeam.name} resmi dimulai!</div>`;
    
    // Show match center screen overlay
    document.getElementById("match-center").classList.add("active");
    document.getElementById("post-match-overlay").classList.remove("active");
    
    // Sound FX
    playRefereeWhistle("short");
    startCrowdSound();
    
    // Start Ticking
    runMatchTick();
}

function updateBallPosition(zone) {
    const ball = document.getElementById("field-ball");
    if (!ball) return;
    
    ball.className = "match-ball"; // reset
    if (zone === "center") {
        ball.classList.add("center");
    } else if (zone === "user-defense") {
        ball.classList.add("user-defense");
    } else if (zone === "user-midfield") {
        ball.classList.add("user-midfield");
    } else if (zone === "user-attack") {
        ball.classList.add("user-attack");
    } else if (zone === "opp-defense") {
        ball.classList.add("opp-defense");
    } else if (zone === "opp-midfield") {
        ball.classList.add("opp-midfield");
    } else if (zone === "opp-attack") {
        ball.classList.add("opp-attack");
    }
}

function runMatchTick() {
    if (activeMatch.minute >= 90) {
        finishMatch();
        return;
    }
    
    // Advance minutes
    const step = randomRange(4, 7);
    activeMatch.minute = Math.min(90, activeMatch.minute + step);
    
    // Calculate live rating values (which might change due to in-game subs/mentality)
    const userStrength = calculateLiveUserMatchStrength();
    const oppStrength = activeMatch.oppTeam.rating;
    
    // Midfield ratings dictate possession
    const userMid = activeMatch.starters.filter(p => p.position === "MF").reduce((a,b)=>a+b.rating,0) / Math.max(1, activeMatch.starters.filter(p => p.position === "MF").length);
    const oppMid = oppStrength;
    const mentalityMod = document.getElementById("mc-mentality").value;
    
    let possessionBase = 50 + (userMid - oppMid) * 1.5;
    if (mentalityMod === "attacking") possessionBase += 5;
    if (mentalityMod === "defensive") possessionBase -= 5;
    possessionBase = Math.max(25, Math.min(75, possessionBase));
    
    activeMatch.stats.user.possession = Math.round(possessionBase);
    activeMatch.stats.opp.possession = 100 - activeMatch.stats.user.possession;
    
    // Chance of event
    const eventChance = randomRange(0, 100);
    let commentText = "";
    let commentType = "info"; // info, action, goal, card
    
    // Choose ball zone
    let ballZone = "center";
    if (eventChance < 40) {
        ballZone = "user-midfield";
    } else if (eventChance < 70) {
        ballZone = "user-attack";
    } else {
        ballZone = "user-defense";
    }
    updateBallPosition(ballZone);
    
    if (eventChance < 45) {
        // Attack opportunity! Who attacks?
        const isUserAttack = Math.random() * 100 < possessionBase;
        
        if (isUserAttack) {
            commentType = "action";
            const shooter = getRandomActivePlayer("FW", "MF");
            const opponentGK = "Kiper Lawan";
            
            activeMatch.stats.user.shots++;
            
            // Success probability attack vs defense
            const attackStrength = userStrength * (mentalityMod === "attacking" ? 1.15 : (mentalityMod === "defensive" ? 0.85 : 1));
            const goalChance = (attackStrength / (oppStrength + 10)) * 30 + randomRange(-15, 15);
            
            if (goalChance > 25) {
                // Shot on Target
                activeMatch.stats.user.shotsOnTarget++;
                
                // GK save attempt
                if (Math.random() * 100 < 40) {
                    commentText = `${activeMatch.minute}' - Tembakan keras dari ${shooter.name} ke arah gawang! Namun berhasil ditepis dengan gemilang oleh kiper lawan!`;
                    setCrowdIntensity(1);
                } else {
                    // GOAL!
                    activeMatch.stats.user.shotsOnTarget++;
                    activeMatch.userGoals++;
                    commentType = "goal";
                    const assister = getRandomActivePlayerExcept("MF", "DF", shooter.id);
                    const assistText = assister ? ` (assist oleh ${assister.name})` : "";
                    commentText = `⚽ ${activeMatch.minute}' - GOOOOOLLLL! ${shooter.name} melepaskan tendangan melengkung akurat menjebol gawang lawan! Skor menjadi ${activeMatch.userGoals} - ${activeMatch.oppGoals}${assistText}.`;
                    
                    activeMatch.scorers.push({ team: "user", player: shooter.name, minute: activeMatch.minute, id: shooter.id, assister: assister ? assister.name : null, assisterId: assister ? assister.id : null });
                    setCrowdIntensity(2);
                }
            } else {
                commentText = `${activeMatch.minute}' - Kerja sama apik dari lini tengah ${activeMatch.userTeam.name}, namun tendangan ${shooter.name} melambung tipis di atas mistar gawang.`;
            }
        } else {
            // Opponent Attack
            commentType = "action";
            const shooterName = getRandomElement(activeMatch.oppPlayers).name;
            const userGK = activeMatch.starters.find(p => p.position === "GK") || { name: "Kiper" };
            
            activeMatch.stats.opp.shots++;
            
            const defStrength = userStrength * (mentalityMod === "defensive" ? 1.15 : (mentalityMod === "attacking" ? 0.85 : 1));
            const goalChance = (oppStrength / (defStrength + 10)) * 28 + randomRange(-15, 15);
            
            if (goalChance > 25) {
                activeMatch.stats.opp.shotsOnTarget++;
                if (Math.random() * 100 < 42) {
                    commentText = `${activeMatch.minute}' - ${activeMatch.oppTeam.name} menekan! Tembakan keras ${shooterName} meluncur deras, namun diselamatkan secara akrobatik oleh ${userGK.name}!`;
                    setCrowdIntensity(1);
                } else {
                    activeMatch.oppGoals++;
                    commentType = "goal";
                    commentText = `⚽ ${activeMatch.minute}' - GOL bagi ${activeMatch.oppTeam.name}! Umpan silang disambar sundulan tajam oleh ${shooterName} tanpa mampu dihalau kiper. Skor ${activeMatch.userGoals} - ${activeMatch.oppGoals}.`;
                    
                    activeMatch.scorers.push({ team: "opp", player: shooterName, minute: activeMatch.minute });
                    setCrowdIntensity(0);
                }
            } else {
                commentText = `${activeMatch.minute}' - Striker ${activeMatch.oppTeam.name} mencoba menusuk kotak penalti, namun berhasil dipatahkan oleh pertahanan disiplin ${activeMatch.userTeam.name}.`;
            }
        }
    } else if (eventChance < 60) {
        // Foul / Card event
        const isUserFoul = Math.random() > 0.5;
        if (isUserFoul) {
            activeMatch.stats.user.fouls++;
            const player = getRandomActivePlayer("DF", "MF");
            const cardRoll = randomRange(1, 100);
            if (cardRoll > 80) {
                // Red card!
                activeMatch.stats.user.redCards++;
                commentType = "card";
                commentText = `🔴 ${activeMatch.minute}' - KARTU MERAH! Pelanggaran keras dilakukan oleh ${player.name}. Wasit langsung mengeluarkan kartu merah dari sakunya!`;
                // Mark player as suspended in match roster and drop rating
                player.suspended = true;
                player.rating = Math.max(10, player.rating - 15); // penalize active match rating
            } else if (cardRoll > 45) {
                // Yellow card
                activeMatch.stats.user.yellowCards++;
                commentType = "card";
                commentText = `🟡 ${activeMatch.minute}' - Kartu kuning bagi ${player.name} setelah melakukan tekel terlambat dari belakang.`;
            } else {
                commentText = `${activeMatch.minute}' - Pelanggaran dilakukan oleh ${player.name} di area pertahanan. Wasit memberikan peringatan lisan.`;
            }
        } else {
            activeMatch.stats.opp.fouls++;
            const oppName = getRandomElement(activeMatch.oppPlayers).name;
            const cardRoll = randomRange(1, 100);
            if (cardRoll > 80) {
                activeMatch.stats.opp.redCards++;
                commentType = "card";
                commentText = `🔴 ${activeMatch.minute}' - Kartu merah bagi pemain ${activeMatch.oppTeam.name}! Tekel brutalnya terhadap striker kita langsung berbuah kartu merah!`;
            } else if (cardRoll > 45) {
                activeMatch.stats.opp.yellowCards++;
                commentType = "card";
                commentText = `🟡 ${activeMatch.minute}' - Wasit mengganjar kartu kuning kepada ${oppName} akibat menarik baju pemain lawan.`;
            } else {
                commentText = `${activeMatch.minute}' - Perebutan bola ketat, ${oppName} menjatuhkan gelandang kita. Hanya tendangan bebas biasa.`;
            }
        }
    } else if (eventChance < 68) {
        // Injury event
        if (Math.random() > 0.5) {
            const player = getRandomActivePlayer("FW", "MF", "DF");
            const injuryRoll = randomRange(1, 3);
            player.injured = injuryRoll;
            commentType = "card";
            commentText = `🚨 ${activeMatch.minute}' - Cedera! ${player.name} terjatuh kesakitan memegangi kakinya. Tim medis masuk lapangan. Tampaknya ia harus diganti! (Out ${injuryRoll} pekan)`;
        } else {
            const oppName = getRandomElement(activeMatch.oppPlayers).name;
            commentText = `${activeMatch.minute}' - Salah satu gelandang ${activeMatch.oppTeam.name} meringis kesakitan dan terpaksa mendapat perawatan di pinggir lapangan.`;
        }
    } else {
        // Standard possession banter text
        const templates = [
            `${activeMatch.minute}' - Kedua tim saling memperebutkan bola di lini tengah. Permainan taktis yang alot.`,
            `${activeMatch.minute}' - Tempo permainan sedikit melambat. Para bek mencoba menguasai bola lebih tenang.`,
            `${activeMatch.minute}' - Umpan-umpan pendek diperagakan oleh skuad ${activeMatch.userTeam.name} di bawah instruksi manager.`,
            `${activeMatch.minute}' - Serangan sayap yang cukup menjanjikan digagalkan oleh kondisi lapangan.`
        ];
        commentText = getRandomElement(templates);
    }
    
    // Add Commentary HTML
    addCommentaryItem(commentText, commentType);
    
    // Update live Match UI
    document.getElementById("mc-user-score").innerText = activeMatch.userGoals;
    document.getElementById("mc-opp-score").innerText = activeMatch.oppGoals;
    document.getElementById("mc-time").innerText = formatMatchTime(activeMatch.minute);
    
    // Update live stats UI
    updateLiveStatsUI();
    
    // Set timer based on speed
    let delay = 2500;
    if (activeMatch.speed === 2) delay = 1200;
    if (activeMatch.speed === 3) delay = 350;
    if (activeMatch.speed === 999) delay = 0; // Skip
    
    if (delay === 0) {
        // fast simulation
        setTimeout(runMatchTick, 2);
    } else {
        activeMatch.timerId = setTimeout(runMatchTick, delay);
    }
}

function calculateLiveUserMatchStrength() {
    // Calculated from starting 11 ratings
    const sum = activeMatch.starters.reduce((acc, p) => acc + p.rating, 0);
    return sum / activeMatch.starters.length;
}

function getRandomActivePlayer(pos1, pos2 = null, pos3 = null) {
    let list = activeMatch.starters.filter(p => p.position === pos1 || p.position === pos2 || p.position === pos3);
    if (list.length === 0) list = activeMatch.starters; // fallback
    return getRandomElement(list);
}

function getRandomActivePlayerExcept(pos1, pos2, exceptId) {
    let list = activeMatch.starters.filter(p => (p.position === pos1 || p.position === pos2) && p.id !== exceptId);
    if (list.length === 0) return null;
    return getRandomElement(list);
}

function formatMatchTime(min) {
    if (min < 10) return "0" + min + ":00";
    return min + ":00";
}

function addCommentaryItem(text, type) {
    const list = document.getElementById("mc-commentary-list");
    const item = document.createElement("div");
    item.className = "comment-item";
    
    if (type === "system") item.classList.add("comment-system");
    else if (type === "action") item.classList.add("comment-action");
    else if (type === "goal") item.classList.add("comment-goal");
    else if (type === "card") item.classList.add("comment-card");
    
    item.innerText = text;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
}

function updateLiveStatsUI() {
    document.getElementById("stat-poss-user").innerText = activeMatch.stats.user.possession + "%";
    document.getElementById("stat-poss-opp").innerText = activeMatch.stats.opp.possession + "%";
    document.getElementById("stat-bar-poss-user").style.width = activeMatch.stats.user.possession + "%";
    document.getElementById("stat-bar-poss-opp").style.width = activeMatch.stats.opp.possession + "%";
    
    document.getElementById("stat-shots-user").innerText = `${activeMatch.stats.user.shots} (${activeMatch.stats.user.shotsOnTarget})`;
    document.getElementById("stat-shots-opp").innerText = `${activeMatch.stats.opp.shots} (${activeMatch.stats.opp.shotsOnTarget})`;
    
    document.getElementById("stat-fouls-user").innerText = activeMatch.stats.user.fouls;
    document.getElementById("stat-fouls-opp").innerText = activeMatch.stats.opp.fouls;
    
    document.getElementById("stat-cards-user").innerText = `${activeMatch.stats.user.yellowCards} K / ${activeMatch.stats.user.redCards} M`;
    document.getElementById("stat-cards-opp").innerText = `${activeMatch.stats.opp.yellowCards} K / ${activeMatch.stats.opp.redCards} M`;
}

// ==========================================
// SIMULATION ENGINE: FINISH MATCH & WEEK UPDATES
// ==========================================
function finishMatch() {
    if (activeMatch.timerId) clearTimeout(activeMatch.timerId);
    
    // Referee long whistle
    playRefereeWhistle("long");
    stopCrowdSound();
    
    // Determine outcomes
    const isUserWin = activeMatch.userGoals > activeMatch.oppGoals;
    const isDraw = activeMatch.userGoals === activeMatch.oppGoals;
    
    // Calculate finance ticket income
    let ticketIncome = 0;
    if (activeMatch.isHome) {
        const capacity = STADIUM_UPGRADES[gameState.stadiumLevel - 1].capacity;
        // Fans occupancy scaled by user popularity rank
        const rankWeight = (17 - gameState.rank) / 16; // rank 1 = 1, rank 16 = 0.06
        const occupancy = 0.4 + (rankWeight * 0.6) + (isUserWin ? 0.05 : -0.05);
        const spectators = Math.min(capacity, Math.round(capacity * Math.max(0.3, Math.min(1, occupancy))));
        ticketIncome = spectators * BASE_TICKET_PRICE;
        gameState.financesHistory.ticketRevenue += ticketIncome;
    }
    
    // Save points to user team
    const userTeam = gameState.teams.find(t => t.isUser);
    const oppTeam = gameState.teams.find(t => t.name === activeMatch.oppTeam.name);
    
    userTeam.played++;
    oppTeam.played++;
    userTeam.gf += activeMatch.userGoals;
    userTeam.ga += activeMatch.oppGoals;
    userTeam.gd = userTeam.gf - userTeam.ga;
    
    oppTeam.gf += activeMatch.oppGoals;
    oppTeam.ga += activeMatch.userGoals;
    oppTeam.gd = oppTeam.gf - oppTeam.ga;
    
    let pointsAwarded = 0;
    let matchResultSymbol = "D";
    
    if (isUserWin) {
        userTeam.won++;
        userTeam.points += 3;
        oppTeam.lost++;
        pointsAwarded = 3;
        matchResultSymbol = "W";
    } else if (isDraw) {
        userTeam.drawn++;
        userTeam.points += 1;
        oppTeam.drawn++;
        oppTeam.points += 1;
        pointsAwarded = 1;
        matchResultSymbol = "D";
    } else {
        userTeam.lost++;
        oppTeam.won++;
        oppTeam.points += 3;
        pointsAwarded = 0;
        matchResultSymbol = "L";
    }
    
    // Record match in schedule database
    const currentWeekSchedule = gameState.schedule[gameState.week - 1];
    const matchRecord = currentWeekSchedule.find(m => m.homeTeam === activeMatch.userTeam.name || m.awayTeam === activeMatch.userTeam.name);
    
    if (matchRecord) {
        matchRecord.played = true;
        matchRecord.homeScore = activeMatch.isHome ? activeMatch.userGoals : activeMatch.oppGoals;
        matchRecord.awayScore = activeMatch.isHome ? activeMatch.oppGoals : activeMatch.userGoals;
        matchRecord.scorers = activeMatch.scorers;
    }
    
    // Apply fatigue, injury and card updates to the REAL squad
    applyMatchAftermathToRealSquad(matchResultSymbol);
    
    // Simulate other 7 league matches for this week
    simulateOtherLeagueMatches();
    
    // Calculate new standings rank
    recalculateStandings();
    
    // Log recent results
    gameState.recentResults.unshift({
        week: gameState.week,
        opponent: activeMatch.oppTeam.name,
        userScore: activeMatch.userGoals,
        oppScore: activeMatch.oppGoals,
        outcome: matchResultSymbol
    });
    if (gameState.recentResults.length > 5) gameState.recentResults.pop();
    
    // Complete Finances week sheet logic
    runWeeklyFinancialCycle(ticketIncome);
    
    // Open Post match report modal overlay
    document.getElementById("pm-user-team").innerText = activeMatch.userTeam.name;
    document.getElementById("pm-opp-team").innerText = activeMatch.oppTeam.name;
    document.getElementById("pm-score").innerText = `${activeMatch.userGoals} - ${activeMatch.oppGoals}`;
    
    // Print scorers summary
    const scorersList = document.getElementById("pm-scorers-list");
    scorersList.innerHTML = "";
    if (activeMatch.scorers.length > 0) {
        activeMatch.scorers.forEach(s => {
            const div = document.createElement("div");
            div.innerText = `⚽ ${s.player} (${s.minute}') - ${s.team === 'user' ? activeMatch.userTeam.name : activeMatch.oppTeam.name}`;
            scorersList.appendChild(div);
        });
    } else {
        scorersList.innerHTML = "<div>Tidak ada gol tercipta.</div>";
    }
    
    // Print winnings
    document.getElementById("pm-revenue").innerText = ticketIncome > 0 ? formatMoney(ticketIncome) : "$0 (Laga Tandang)";
    document.getElementById("pm-points").innerText = `+${pointsAwarded} Poin`;
    
    document.getElementById("post-match-overlay").classList.add("active");
}

function applyMatchAftermathToRealSquad(outcome) {
    // Apply energy depletion to players who started the game
    // Attacking playstyle depletes more energy
    const style = gameState.tactic.mentality;
    const rate = style === "attacking" ? 22 : (style === "defensive" ? 14 : 18);
    
    activeMatch.starters.forEach(startedPlayer => {
        const real = gameState.squad.find(p => p.id === startedPlayer.id);
        if (real) {
            // Deplete energy
            real.energy = Math.max(10, real.energy - randomRange(rate - 4, rate + 4));
            
            // Record player matches appearances
            real.stats.matches++;
            
            // Sync goals & assists
            const scoredCount = activeMatch.scorers.filter(s => s.team === 'user' && s.id === startedPlayer.id).length;
            real.stats.goals += scoredCount;
            
            const assistCount = activeMatch.scorers.filter(s => s.team === 'user' && s.assisterId === startedPlayer.id).length;
            real.stats.assists += assistCount;
            
            // Sync cards
            // If player got red carded or accumulated yellow cards
            // In a simplified way, let's look at activeMatch.stats.user cards and assign them
            // Let's check if this player was marked suspended in activeMatch
            if (startedPlayer.suspended) {
                real.suspended = true;
            }
            
            // Sync injuries
            if (startedPlayer.injured > 0) {
                real.injured = startedPlayer.injured;
                real.energy = 50; // injured players drop energy
            }
            
            // Moral shifts
            if (outcome === "W") real.form = Math.min(5, real.form + 1);
            if (outcome === "L" && Math.random() > 0.6) real.form = Math.max(1, real.form - 1);
        }
    });
    
    // Players on the bench recover energy
    activeMatch.bench.forEach(benchPlayer => {
        const real = gameState.squad.find(p => p.id === benchPlayer.id);
        if (real) {
            real.energy = Math.min(100, real.energy + 25);
            // Recover moral slightly
            if (outcome === "W" && Math.random() > 0.8) real.form = Math.min(5, real.form + 1);
        }
    });
}

function simulateOtherLeagueMatches() {
    const currentWeekSchedule = gameState.schedule[gameState.week - 1];
    
    currentWeekSchedule.forEach(match => {
        // Skip user's match as it is already simulated manually
        if (match.homeTeam === gameState.teamName || match.awayTeam === gameState.teamName) {
            return;
        }
        
        const homeObj = gameState.teams.find(t => t.name === match.homeTeam);
        const awayObj = gameState.teams.find(t => t.name === match.awayTeam);
        
        const homeRat = homeObj.rating + 3; // +3 Home Advantage
        const awayRat = awayObj.rating;
        
        // Sim expected goals
        let homeG = Math.floor(Math.pow(homeRat / 80, 2) * randomRange(0, 3));
        let awayG = Math.floor(Math.pow(awayRat / 80, 2) * randomRange(0, 3));
        
        // Ensure some variability
        if (Math.random() > 0.9) {
            homeG += randomRange(1, 2);
        }
        if (Math.random() > 0.9) {
            awayG += randomRange(1, 2);
        }
        
        match.homeScore = homeG;
        match.awayScore = awayG;
        match.played = true;
        
        homeObj.played++;
        awayObj.played++;
        homeObj.gf += homeG;
        homeObj.ga += awayG;
        homeObj.gd = homeObj.gf - homeObj.ga;
        
        awayObj.gf += awayG;
        awayObj.ga += homeG;
        awayObj.gd = awayObj.gf - awayObj.ga;
        
        if (homeG > awayG) {
            homeObj.won++;
            homeObj.points += 3;
            awayObj.lost++;
        } else if (homeG === awayG) {
            homeObj.drawn++;
            homeObj.points += 1;
            awayObj.drawn++;
            awayObj.points += 1;
        } else {
            homeObj.lost++;
            awayObj.won++;
            awayObj.points += 3;
        }
        
        // Assign random goalscorers to AI teams to populate the league top scorers list!
        for(let i=0; i<homeG; i++) {
            const scorerName = getRandomElement(LAST_NAMES) + " (" + homeObj.jersey + ")";
            match.scorers.push({ team: "home", player: scorerName });
        }
        for(let i=0; i<awayG; i++) {
            const scorerName = getRandomElement(LAST_NAMES) + " (" + awayObj.jersey + ")";
            match.scorers.push({ team: "away", player: scorerName });
        }
    });
}

function recalculateStandings() {
    // Sort teams by Points (desc), Goal Difference (desc), Goals For (desc), Name
    gameState.teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.name.localeCompare(b.name);
    });
    
    // Find user's new rank
    const userIndex = gameState.teams.findIndex(t => t.isUser);
    gameState.rank = userIndex + 1;
}

function runWeeklyFinancialCycle(ticketsInc) {
    // Weekly incomes
    const sponsorIncome = 250000;
    const merchandiseIncome = Math.round(120000 * ((17 - gameState.rank) / 16 + 0.5));
    const weeklyIncomesTotal = ticketsInc + sponsorIncome + merchandiseIncome;
    
    // Weekly expenses
    const wagesBill = gameState.squad.reduce((acc, p) => acc + p.salary, 0);
    const maintStad = STADIUM_UPGRADES[gameState.stadiumLevel - 1].maintenance;
    const maintTrain = TRAINING_UPGRADES[gameState.trainingLevel - 1].maintenance;
    const maintYouth = YOUTH_UPGRADES[gameState.youthLevel - 1].maintenance;
    const maintTotal = maintStad + maintTrain + maintYouth;
    
    const weeklyExpensesTotal = wagesBill + maintTotal;
    
    const profit = weeklyIncomesTotal - weeklyExpensesTotal;
    
    // Save finance history for UI reporting
    gameState.financesHistory.ticketRevenue = ticketsInc;
    gameState.financesHistory.sponsorRevenue = sponsorIncome;
    gameState.financesHistory.merchandiseRevenue = merchandiseIncome;
    gameState.financesHistory.playerWages = wagesBill;
    gameState.financesHistory.maintenanceCosts = maintTotal;
    
    gameState.balance += profit;
    
    // Email summary
    const finMail = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        sender: "Akuntan Klub",
        time: `Pekan ${gameState.week}`,
        subject: `Laporan Keuangan Pekan ${gameState.week}`,
        body: `Berikut adalah neraca keuangan klub pekan ini:\n\nPEMASUKAN:\n- Tiket Stadion: ${formatMoney(ticketsInc)}\n- Sponsor: ${formatMoney(sponsorIncome)}\n- Merchandise: ${formatMoney(merchandiseIncome)}\nTOTAL PEMASUKAN: ${formatMoney(weeklyIncomesTotal)}\n\nPENGELUARAN:\n- Gaji Skuad: ${formatMoney(wagesBill)}\n- Perawatan Fasilitas: ${formatMoney(maintTotal)}\nTOTAL PENGELUARAN: ${formatMoney(weeklyExpensesTotal)}\n\nLaba/Rugi Bersih Pekan ini: ${profit >= 0 ? '+' : ''}${formatMoney(profit)}\nSaldo kas saat ini: ${formatMoney(gameState.balance)}`,
        read: false
    };
    gameState.inbox.unshift(finMail);
    
    // Advanced training facility ticks (player upgrades)
    applyTrainingUpgradeWeeklyProgress();
    
    // Youth Academy weekly progress
    applyYouthAcademyWeeklyProgress();
    
    // Recover player suspensions and minor injuries
    gameState.squad.forEach(p => {
        if (p.injured > 0) {
            p.injured--;
        }
        // Suspensions are cleared after 1 match week
        if (p.suspended) {
            p.suspended = false;
        }
    });
}

function applyTrainingUpgradeWeeklyProgress() {
    const boost = TRAINING_UPGRADES[gameState.trainingLevel - 1].boost;
    gameState.squad.forEach(p => {
        // Young players (<23) improve rapidly
        if (p.age <= 23 && p.rating < 95) {
            const oldRating = Math.floor(p.rating);
            p.rating += (boost + randomRange(0, 5) / 100);
            const newRating = Math.floor(p.rating);
            
            if (newRating > oldRating) {
                const trainingMail = {
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    sender: "Pelatih Kepala",
                    time: `Pekan ${gameState.week}`,
                    subject: `Perkembangan Pemain: ${p.name}`,
                    body: `Laporan Latihan:\nPemain muda kita ${p.name} (${p.position}) telah berlatih dengan sangat keras pekan ini. Rating kemampuannya meningkat dari ${oldRating} menjadi ${newRating}!\n\nNilai pasarnya kini naik menjadi ${formatMoney(p.value)}.`,
                    read: false
                };
                gameState.inbox.unshift(trainingMail);
                
                // Recalculate player valuation
                p.value = calculatePlayerValue(newRating, p.age);
                p.salary = calculatePlayerSalary(newRating);
            }
        }
        // Older players decline slowly if age > 31
        else if (p.age > 31 && p.rating > 40) {
            const oldRating = Math.floor(p.rating);
            p.rating -= 0.04;
            const newRating = Math.floor(p.rating);
            
            if (newRating < oldRating) {
                p.value = calculatePlayerValue(newRating, p.age);
                p.salary = calculatePlayerSalary(newRating);
            }
        }
    });
}

function applyYouthAcademyWeeklyProgress() {
    const config = YOUTH_UPGRADES[gameState.youthLevel - 1];
    gameState.youthProgress++;
    
    if (gameState.youthProgress >= config.interval) {
        gameState.youthProgress = 0; // reset
        
        // Generate youth player
        const newPlayer = generatePlayer(null, config.minRating, config.maxRating);
        newPlayer.age = randomRange(16, 18); // Youth academy graduates are young
        newPlayer.value = calculatePlayerValue(newPlayer.rating, newPlayer.age);
        newPlayer.salary = calculatePlayerSalary(newPlayer.rating);
        
        if (gameState.squad.length < SQUAD_MAX_SIZE) {
            gameState.squad.push(newPlayer);
            const youthMail = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                sender: "Akademi Pemuda",
                time: `Pekan ${gameState.week}`,
                subject: `Lulusan Akademi: ${newPlayer.name}`,
                body: `Kami bangga mempersembahkan bakat muda terbaru hasil didikan akademi kami: ${newPlayer.name} (${newPlayer.position}), umur ${newPlayer.age} tahun, dengan rating bakat awal senilai ${newPlayer.rating}.\n\nPemain ini telah resmi dimasukkan ke dalam skuad utama tanpa biaya transfer!`,
                read: false
            };
            gameState.inbox.unshift(youthMail);
        } else {
            const youthMail = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                sender: "Akademi Pemuda",
                time: `Pekan ${gameState.week}`,
                subject: `Gagal Promosi Akademi: Skuad Penuh`,
                body: `Seorang talenta muda berumur 17 tahun siap untuk dipromosikan pekan ini. Namun, skuad utama Anda sudah penuh (Maksimal ${SQUAD_MAX_SIZE} pemain).\n\nKami terpaksa melepas bakat muda ini ke klub amatir lain. Segera jual pemain Anda untuk meluangkan slot skuad!`,
                read: false
            };
            gameState.inbox.unshift(youthMail);
        }
    }
}

function advanceWeek() {
    // Increment week
    gameState.week++;
    
    if (gameState.week > 30) {
        finishSeason();
        return;
    }
    
    // Refresh transfer market players
    refreshTransferMarket(true);
    
    // Save game state
    saveGame();
    
    // UI update
    updateUI();
}

function finishSeason() {
    const isChampions = gameState.rank === 1;
    const isRelegated = gameState.rank >= 14;
    
    let title = "";
    let msg = "";
    
    if (isChampions) {
        title = "🏆 ANDA JUARA LIGA!";
        msg = `Luar biasa! Manajer ${gameState.managerName} sukses membawa ${gameState.teamName} menjadi juara liga musim ini!\n\nAnda mendapat bonus trofi dan dana tunai sebesar $15,000,000! Kontrak Anda diperpanjang.`;
        gameState.balance += 15000000;
    } else if (isRelegated) {
        title = "❌ DI-PHK OLEH DIREKSI";
        msg = `Sangat disayangkan. ${gameState.teamName} menduduki peringkat ke-${gameState.rank} dan harus terdegradasi dari liga utama. Direksi memutuskan memutus kontrak kerja Anda.\n\nMemulai ulang karir baru.`;
    } else {
        title = "🏁 MUSIM SELESAI!";
        msg = `Musim selesai! Anda memimpin ${gameState.teamName} finis di peringkat ke-${gameState.rank} klasemen.\n\nDireksi mengapresiasi kinerja Anda. Bonus akhir musim sebesar $5,000,000 masuk ke kas klub. Bersiaplah menghadapi musim depan!`;
        gameState.balance += 5000000;
    }
    
    alert(`${title}\n\n${msg}`);
    
    if (isRelegated) {
        // Reset career
        setupNewGame(gameState.managerName, gameState.teamName, gameState.difficulty);
    } else {
        // Reset league tables for next season
        gameState.week = 1;
        gameState.teams.forEach(t => {
            t.played = 0; t.won = 0; t.drawn = 0; t.lost = 0; t.gf = 0; t.ga = 0; t.gd = 0; t.points = 0;
            // Slightly shuffle team ratings for dynamism in next season!
            if (!t.isUser) {
                t.rating = Math.max(65, Math.min(88, t.rating + randomRange(-2, 2)));
            }
        });
        // reset schedule
        generateLeagueSchedule();
        // reset player stats
        gameState.squad.forEach(p => {
            p.stats = { goals: 0, assists: 0, matches: 0 };
            p.energy = 100;
            p.injured = 0;
            p.suspended = false;
        });
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Direksi Klub",
            time: "Pekan 1",
            subject: "Selamat Datang di Musim Baru!",
            body: `Musim baru telah bergulir! Direksi mengharapkan performa yang lebih baik dari musim lalu. Perkuat skuad Anda melalui bursa transfer yang telah dibuka kembali.`,
            read: false
        });
        
        saveGame();
    }
    
    updateUI();
}

// ==========================================
// RENDER UI STANDINGS, SQUAD AND MARKET
// ==========================================
function updateUI() {
    // Header
    document.getElementById("header-club-name").innerText = gameState.teamName;
    document.getElementById("header-manager-name").innerText = gameState.managerName;
    document.getElementById("current-week").innerText = gameState.week + "/30";
    document.getElementById("current-balance").innerText = formatMoney(gameState.balance);
    document.getElementById("current-rank").innerText = "Ke-" + gameState.rank;
    
    // Active tabs updates
    try { renderDashboardTab(); } catch(e) { console.error("renderDashboardTab error", e); }
    try { renderSquadTab(); } catch(e) { console.error("renderSquadTab error", e); }
    try { renderStandingsTab(); } catch(e) { console.error("renderStandingsTab error", e); }
    try { renderTransfersTab(); } catch(e) { console.error("renderTransfersTab error", e); }
    renderFacilitiesTab();
    renderFinancesTab();
}

function renderDashboardTab() {
    // Next opponent lookup
    try {
        if (gameState.week <= 30 && gameState.schedule && gameState.schedule[gameState.week - 1]) {
            const currentMatches = gameState.schedule[gameState.week - 1];
            const userMatch = currentMatches.find(m => m.homeTeam === gameState.teamName || m.awayTeam === gameState.teamName);
            
            if (userMatch) {
                const isHome = userMatch.homeTeam === gameState.teamName;
                const oppName = isHome ? userMatch.awayTeam : userMatch.homeTeam;
                const oppObj = gameState.teams.find(t => t.name === oppName);
                
                document.getElementById("vs-opp-name").innerText = oppName;
                document.getElementById("vs-opp-rating").innerText = "Rating: " + (oppObj ? oppObj.rating : "?");
                document.getElementById("vs-opp-jersey").innerText = oppObj ? (oppObj.jersey || "OPP") : "OPP";
                
                document.getElementById("vs-user-name").innerText = gameState.teamName;
                document.getElementById("vs-user-rating").innerText = "Rating: " + Math.round(calculateTeamRatings());
                
                document.getElementById("match-home-away").className = isHome ? "badge" : "badge badge-info";
                document.getElementById("match-home-away").innerText = isHome ? "HOME" : "AWAY";
                document.getElementById("match-venue").innerText = isHome ? "Stadion Utama " + gameState.teamName : "Stadion Utama " + oppName;
                
                document.getElementById("play-match-btn").innerText = "SIMULASI LAGA ➔";
                document.getElementById("play-match-btn").disabled = false;
            }
        } else if (gameState.week > 30) {
            document.getElementById("play-match-btn").innerText = "MUSIM SELESAI";
            document.getElementById("play-match-btn").disabled = true;
        }
    } catch (e) {
        console.error("Dashboard Next Opponent Error:", e);
    }
    
    // Inbox rendering
    const inboxList = document.getElementById("inbox-list");
    inboxList.innerHTML = "";
    if (gameState.inbox.length === 0) {
        inboxList.innerHTML = `<div class="no-data-msg">Tidak ada email masuk.</div>`;
    } else {
        gameState.inbox.forEach(mail => {
            const item = document.createElement("div");
            item.className = "inbox-item" + (mail.read ? " read" : "");
            item.innerHTML = `
                <div class="inbox-meta">
                    <span class="inbox-sender">${mail.sender}</span>
                    <span class="inbox-time">${mail.time}</span>
                </div>
                <div class="inbox-subject">${mail.subject}</div>
                <div class="inbox-body">${mail.body.replace(/\n/g, '<br>')}</div>
            `;
            item.addEventListener('click', () => {
                mail.read = true;
                item.classList.add("read");
                saveGame();
            });
            inboxList.appendChild(item);
        });
    }
    
    // Overview numbers
    document.getElementById("ov-stadium-capacity").innerText = STADIUM_UPGRADES[gameState.stadiumLevel - 1].capacity.toLocaleString() + " Penonton";
    document.getElementById("ov-training-lvl").innerText = `Lvl ${gameState.trainingLevel} (${TRAINING_UPGRADES[gameState.trainingLevel - 1].name})`;
    document.getElementById("ov-youth-lvl").innerText = `Lvl ${gameState.youthLevel} (${YOUTH_UPGRADES[gameState.youthLevel - 1].name})`;
    
    const avgEnergy = Math.round(gameState.squad.reduce((a,b)=>a+b.energy, 0) / gameState.squad.length);
    document.getElementById("ov-avg-energy").innerText = avgEnergy + "% Energi Rata-rata";
    
    // Recent match results in dashboard
    const recList = document.getElementById("recent-results-list");
    recList.innerHTML = "";
    if (gameState.recentResults.length === 0) {
        recList.innerHTML = `<div class="no-data-msg">Belum ada pertandingan yang dimainkan musim ini.</div>`;
    } else {
        gameState.recentResults.forEach(r => {
            const item = document.createElement("div");
            item.className = "result-item-row";
            
            let badgeClass = "outcome-draw";
            if (r.outcome === "W") badgeClass = "outcome-win";
            if (r.outcome === "L") badgeClass = "outcome-rose";
            
            item.innerHTML = `
                <span class="res-week">Pekan ${r.week}</span>
                <span class="res-teams">${gameState.teamName} <span class="res-outcome ${badgeClass}">${r.userScore} - ${r.oppScore}</span> ${r.opponent}</span>
            `;
            recList.appendChild(item);
        });
    }
}

function renderSquadTab() {
    const tbody = document.getElementById("squad-table-body");
    tbody.innerHTML = "";
    
    const { starters } = getStartingEleven();
    
    // Sort squad: Starters first (GK, DF, MF, FW), then Bench
    const sortedSquad = [...gameState.squad].sort((a, b) => {
        const aStart = starters.find(s => s.id === a.id) ? 1 : 0;
        const bStart = starters.find(s => s.id === b.id) ? 1 : 0;
        
        if (aStart !== bStart) return bStart - aStart; // starters first
        
        // Position order: GK, DF, MF, FW
        const posVal = { GK: 1, DF: 2, MF: 3, FW: 4 };
        if (posVal[a.position] !== posVal[b.position]) {
            return posVal[a.position] - posVal[b.position];
        }
        return b.rating - a.rating; // highest rating first
    });
    
    document.getElementById("squad-size-indicator").innerText = `${gameState.squad.length} / ${SQUAD_MAX_SIZE} Pemain`;
    
    // Fill captain and penalty dropdowns
    const captainSelect = document.getElementById("tactic-captain");
    const penaltySelect = document.getElementById("tactic-penalty");
    
    const prevCap = captainSelect.value;
    const prevPen = penaltySelect.value;
    
    captainSelect.innerHTML = "";
    penaltySelect.innerHTML = "";
    
    sortedSquad.forEach(p => {
        const option1 = document.createElement("option");
        option1.value = p.id;
        option1.innerText = `${p.name} (${p.position} - Rat: ${Math.round(p.rating)})`;
        if (p.id === gameState.tactic.captainId) option1.selected = true;
        captainSelect.appendChild(option1);
        
        const option2 = document.createElement("option");
        option2.value = p.id;
        option2.innerText = `${p.name} (${p.position} - Rat: ${Math.round(p.rating)})`;
        if (p.id === gameState.tactic.penaltyId) option2.selected = true;
        penaltySelect.appendChild(option2);
        
        // Render Row
        const tr = document.createElement("tr");
        const isStarter = starters.find(s => s.id === p.id);
        tr.className = isStarter ? "starting-row" : "bench-row";
        
        // Status Icons
        let statusHtml = isStarter ? "⭐ <span class='text-gold' style='font-size:0.7rem'>STARTING</span>" : "<span class='text-muted' style='font-size:0.7rem'>CADANGAN</span>";
        if (p.injured > 0) statusHtml = `🚑 <span class='text-rose' style='font-size:0.7rem'>OUT ${p.injured}W</span>`;
        else if (p.suspended) statusHtml = `🟥 <span class='text-rose' style='font-size:0.7rem'>SUSP</span>`;
        
        // Position Class
        let posClass = "pos-gk";
        if (p.position === "DF") posClass = "pos-df";
        else if (p.position === "MF") posClass = "pos-mf";
        else if (p.position === "FW") posClass = "pos-fw";
        
        // Energy Fill Color
        let energyColor = "var(--color-emerald)";
        if (p.energy < 40) energyColor = "var(--color-rose)";
        else if (p.energy < 75) energyColor = "var(--color-gold)";
        
        // Stars for Form
        const starsHtml = "★".repeat(p.form) + "☆".repeat(5 - p.form);
        
        tr.innerHTML = `
            <td>${statusHtml}</td>
            <td><strong>${p.name}</strong>${p.age <= 21 ? ' <span class="badge badge-info" style="font-size:0.6rem">PROSPEK</span>' : ''}</td>
            <td><span class="player-pos-badge ${posClass}">${p.position}</span></td>
            <td class="player-rating-cell text-gold">${Math.round(p.rating)}</td>
            <td>${p.age} th</td>
            <td>
                <div style="display:flex; align-items:center; gap:0.4rem">
                    <div class="energy-bar-container">
                        <div class="energy-bar-fill" style="width: ${p.energy}%; background-color: ${energyColor}"></div>
                    </div>
                    <span>${p.energy}%</span>
                </div>
            </td>
            <td class="text-gold" style="font-size:0.8rem">${starsHtml}</td>
            <td class="player-stat-cell">${p.stats.matches} L / ${p.stats.goals} G / ${p.stats.assists} A</td>
            <td class="player-stat-cell">${formatMoney(p.salary)}/mg</td>
            <td>
                <button class="secondary-btn btn-sm fire-player-btn" data-id="${p.id}">Pecat</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Add fire click events
    document.querySelectorAll(".fire-player-btn").forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute("data-id");
            firePlayer(id);
        });
    });
    
    // Update squad strength stats text
    document.getElementById("tactic-avg-rating").innerText = Math.round(gameState.squad.reduce((a,b)=>a+b.rating,0)/gameState.squad.length);
    document.getElementById("tactic-starting-rating").innerText = Math.round(calculateTeamRatings() * 10) / 10;
}

function firePlayer(id) {
    if (gameState.squad.length <= 11) {
        alert("Anda tidak bisa memecat pemain karena jumlah skuad Anda minimal 11 pemain untuk bertanding!");
        return;
    }
    const player = gameState.squad.find(p => p.id === id);
    if (confirm(`Apakah Anda yakin ingin memutus kontrak ${player.name} (${player.position})? Biaya kompensasi pemutusan adalah 3x gaji mingguan: ${formatMoney(player.salary * 3)}.`)) {
        const comp = player.salary * 3;
        gameState.balance -= comp;
        gameState.squad = gameState.squad.filter(p => p.id !== id);
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Klub",
            time: `Pekan ${gameState.week}`,
            subject: `Kontrak Diputus: ${player.name}`,
            body: `Kontrak pemain ${player.name} telah resmi diputus secara sepihak. Kompensasi sebesar ${formatMoney(comp)} telah dibayarkan.`,
            read: false
        });
        
        saveGame();
        updateUI();
    }
}

function renderStandingsTab() {
    const tbody = document.getElementById("standings-table-body");
    tbody.innerHTML = "";
    
    gameState.teams.forEach((t, index) => {
        const tr = document.createElement("tr");
        if (t.isUser) tr.className = "user-row";
        
        tr.innerHTML = `
            <td><strong>${index + 1}</strong></td>
            <td>${t.isUser ? '⭐ ' : ''}<strong>${t.name}</strong> <span class="text-muted" style="font-size:0.75rem">(Rat: ${t.rating})</span></td>
            <td>${t.played}</td>
            <td>${t.won}</td>
            <td>${t.drawn}</td>
            <td>${t.lost}</td>
            <td>${t.gf}-${t.ga}</td>
            <td>${t.gd >= 0 ? '+' : ''}${t.gd}</td>
            <td class="text-gold">${t.points}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Top scorers generation based on matches simulated
    const scoreMap = {};
    const assistMap = {};
    
    gameState.schedule.forEach(round => {
        round.forEach(match => {
            if (match.played && match.scorers) {
                match.scorers.forEach(s => {
                    if (s.player) {
                        scoreMap[s.player] = (scoreMap[s.player] || 0) + 1;
                    }
                    if (s.assister) {
                        assistMap[s.assister] = (assistMap[s.assister] || 0) + 1;
                    }
                });
            }
        });
    });
    
    // Sort
    const sortedScorers = Object.keys(scoreMap).map(k => ({ name: k, goals: scoreMap[k] })).sort((a,b) => b.goals - a.goals).slice(0, 5);
    const sortedAssists = Object.keys(assistMap).map(k => ({ name: k, assists: assistMap[k] })).sort((a,b) => b.assists - a.assists).slice(0, 5);
    
    const scorersContainer = document.getElementById("top-scorers-list");
    scorersContainer.innerHTML = "";
    if (sortedScorers.length === 0) {
        scorersContainer.innerHTML = `<div class="no-data-msg" style="padding:0.5rem">Belum ada gol tercatat.</div>`;
    } else {
        sortedScorers.forEach((s, idx) => {
            const div = document.createElement("div");
            div.className = "stat-rank-item";
            div.innerHTML = `
                <div class="stat-rank-left">
                    <span class="stat-rank-num">${idx+1}</span>
                    <span class="stat-player-name">${s.name}</span>
                </div>
                <span class="stat-val-num">${s.goals} Gol</span>
            `;
            scorersContainer.appendChild(div);
        });
    }
    
    const assistsContainer = document.getElementById("top-assists-list");
    assistsContainer.innerHTML = "";
    if (sortedAssists.length === 0) {
        assistsContainer.innerHTML = `<div class="no-data-msg" style="padding:0.5rem">Belum ada assist tercatat.</div>`;
    } else {
        sortedAssists.forEach((s, idx) => {
            const div = document.createElement("div");
            div.className = "stat-rank-item";
            div.innerHTML = `
                <div class="stat-rank-left">
                    <span class="stat-rank-num">${idx+1}</span>
                    <span class="stat-player-name">${s.name}</span>
                </div>
                <span class="stat-val-num">${s.assists} Ast</span>
            `;
            assistsContainer.appendChild(div);
        });
    }
    
    // Render Complete Schedule week selections
    const filterSelect = document.getElementById("schedule-filter-week");
    filterSelect.innerHTML = "";
    for (let w = 1; w <= 30; w++) {
        const opt = document.createElement("option");
        opt.value = w;
        opt.innerText = `Pekan ${w}` + (w === gameState.week ? " (Aktif)" : "");
        if (w === gameState.week) opt.selected = true;
        filterSelect.appendChild(opt);
    }
    renderFilteredSchedule(gameState.week);
}

function renderFilteredSchedule(weekNum) {
    const list = document.getElementById("schedule-match-list");
    list.innerHTML = "";
    const matches = gameState.schedule[weekNum - 1];
    
    if (matches) {
        matches.forEach(m => {
            const row = document.createElement("div");
            row.className = "schedule-item-row";
            
            const isUserHome = m.homeTeam === gameState.teamName;
            const isUserAway = m.awayTeam === gameState.teamName;
            
            const homeTextClass = isUserHome ? "sch-team team-home user-team-name" : "sch-team team-home";
            const awayTextClass = isUserAway ? "sch-team team-away user-team-name" : "sch-team team-away";
            
            const scoreText = m.played ? `${m.homeScore} - ${m.awayScore}` : "VS";
            
            row.innerHTML = `
                <span class="${homeTextClass}">${m.homeTeam}</span>
                <span class="sch-vs">${scoreText}</span>
                <span class="${awayTextClass}">${m.awayTeam}</span>
            `;
            list.appendChild(row);
        });
    }
}

function renderTransfersTab() {
    // Balance
    document.getElementById("transfer-balance-display").innerText = formatMoney(gameState.balance);
    
    // Buy market
    const grid = document.getElementById("market-players-grid");
    grid.innerHTML = "";
    
    gameState.marketPlayers.forEach(p => {
        const card = document.createElement("div");
        card.className = "market-card";
        
        let posClass = "pos-gk";
        if (p.position === "DF") posClass = "pos-df";
        else if (p.position === "MF") posClass = "pos-mf";
        else if (p.position === "FW") posClass = "pos-fw";
        
        card.innerHTML = `
            <div class="market-card-header">
                <div>
                    <span class="m-player-name">${p.name}</span>
                    <div class="m-player-age">Usia: ${p.age} th | Pos: <span class="player-pos-badge ${posClass}">${p.position}</span></div>
                </div>
                <div class="market-rating-badge">${p.rating}</div>
            </div>
            <div class="market-details-row">
                <span>Harga Transfer:</span>
                <span class="m-player-value">${formatMoney(p.value)}</span>
            </div>
            <div class="market-details-row">
                <span>Gaji Pekanan:</span>
                <span>${formatMoney(p.salary)}/mg</span>
            </div>
            <button class="buy-btn buy-market-player-btn" data-id="${p.id}">Beli Kontrak</button>
        `;
        grid.appendChild(card);
    });
    
    // Buy click handlers
    document.querySelectorAll(".buy-market-player-btn").forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute("data-id");
            buyMarketPlayer(id);
        });
    });
    
    // Sell list (User players)
    // List players and potential board offers if they are listed
    const squadSaleTbody = document.getElementById("squad-sale-body");
    squadSaleTbody.innerHTML = "";
    
    gameState.squad.forEach(p => {
        const tr = document.createElement("tr");
        
        // Check if listed (we simulate simple listed items)
        const isListed = p.listed;
        let actionHtml = "";
        
        if (isListed) {
            tr.className = "sale-row-listed";
            // Check if offer exists or generate one
            if (!p.offerValue) {
                // Generate board offer between 85% and 115% value
                p.offerValue = Math.round(p.value * (0.85 + Math.random() * 0.3) / 10000) * 10000;
            }
            actionHtml = `
                <div class="offer-box">
                    <span class="offer-val">${formatMoney(p.offerValue)}</span>
                    <div class="offer-actions">
                        <button class="secondary-btn btn-sm accept-offer-btn text-emerald" data-id="${p.id}">Terima</button>
                        <button class="secondary-btn btn-sm reject-offer-btn text-rose" data-id="${p.id}">Tolak</button>
                    </div>
                </div>
            `;
        } else {
            actionHtml = `<button class="secondary-btn btn-sm list-player-btn" data-id="${p.id}">Daftarkan Dijual</button>`;
        }
        
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td><span class="player-rating-cell text-gold">${Math.round(p.rating)}</span> | ${p.position}</td>
            <td>${formatMoney(p.value)}</td>
            <td>${isListed ? '⏳ Ditawar' : 'Skuad'}</td>
            <td>${actionHtml}</td>
        `;
        squadSaleTbody.appendChild(tr);
    });
    
    // Bind sell actions
    document.querySelectorAll(".list-player-btn").forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute("data-id");
            listPlayerForSale(id);
        });
    });
    document.querySelectorAll(".accept-offer-btn").forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute("data-id");
            acceptOffer(id);
        });
    });
    document.querySelectorAll(".reject-offer-btn").forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute("data-id");
            rejectOffer(id);
        });
    });
}

function buyMarketPlayer(id) {
    if (gameState.squad.length >= SQUAD_MAX_SIZE) {
        alert(`Skuad Anda sudah penuh! Maksimal ${SQUAD_MAX_SIZE} pemain. Pecat atau jual beberapa pemain terlebih dahulu.`);
        return;
    }
    
    const player = gameState.marketPlayers.find(p => p.id === id);
    if (!player) return;
    
    if (gameState.balance < player.value) {
        alert("Saldo Anda tidak mencukupi untuk melakukan transfer ini!");
        return;
    }
    
    if (confirm(`Beli kontrak ${player.name} (${player.position} - Rat: ${player.rating}) seharga ${formatMoney(player.value)}?`)) {
        gameState.balance -= player.value;
        gameState.financesHistory.playerPurchases += player.value;
        
        // Remove from market
        gameState.marketPlayers = gameState.marketPlayers.filter(p => p.id !== id);
        
        // Add to squad
        const newPlayer = {...player};
        newPlayer.listed = false;
        newPlayer.offerValue = null;
        gameState.squad.push(newPlayer);
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Direktur Olahraga",
            time: `Pekan ${gameState.week}`,
            subject: `Pemain Baru Masuk: ${newPlayer.name}`,
            body: `Selamat! Transfer ${newPlayer.name} (${newPlayer.position}) senilai ${formatMoney(newPlayer.value)} telah selesai dengan sukses.\n\nPemain kini siap bergabung dalam sesi latihan taktis bersama tim utama.`,
            read: false
        });
        
        saveGame();
        updateUI();
    }
}

function listPlayerForSale(id) {
    const player = gameState.squad.find(p => p.id === id);
    if (player) {
        player.listed = true;
        player.offerValue = null; // will generate offer
        saveGame();
        renderTransfersTab();
    }
}

function acceptOffer(id) {
    if (gameState.squad.length <= 11) {
        alert("Jumlah skuad utama minimal harus 11 pemain agar Anda dapat bertanding!");
        return;
    }
    const playerIndex = gameState.squad.findIndex(p => p.id === id);
    if (playerIndex === -1) return;
    
    const player = gameState.squad[playerIndex];
    if (confirm(`Lepas ${player.name} dengan tawaran sebesar ${formatMoney(player.offerValue)}?`)) {
        const cash = player.offerValue;
        gameState.balance += cash;
        gameState.financesHistory.playerSales += cash;
        
        // Remove from squad
        gameState.squad.splice(playerIndex, 1);
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Direktur Keuangan",
            time: `Pekan ${gameState.week}`,
            subject: `Pemain Terjual: ${player.name}`,
            body: `Pemain ${player.name} telah resmi hengkang setelah kita menyetujui kesepakatan transfer senilai ${formatMoney(cash)}.\n\nDana transfer masuk telah dicairkan ke rekening klub utama.`,
            read: false
        });
        
        saveGame();
        updateUI();
    }
}

function rejectOffer(id) {
    const player = gameState.squad.find(p => p.id === id);
    if (player) {
        player.listed = false;
        player.offerValue = null;
        saveGame();
        renderTransfersTab();
    }
}

function renderFacilitiesTab() {
    // Stadium capacity
    const stadium = STADIUM_UPGRADES[gameState.stadiumLevel - 1];
    document.getElementById("fac-stadium-capacity").innerText = stadium.capacity.toLocaleString();
    document.getElementById("fac-stadium-revenue").innerText = formatMoney(stadium.capacity * BASE_TICKET_PRICE * 0.7);
    
    if (gameState.stadiumLevel < STADIUM_UPGRADES.length) {
        const nextStad = STADIUM_UPGRADES[gameState.stadiumLevel];
        document.getElementById("fac-stadium-next").innerText = `${nextStad.capacity.toLocaleString()} kursi`;
        document.getElementById("fac-stadium-cost").innerText = formatMoney(nextStad.cost);
        document.getElementById("upgrade-stadium-btn").disabled = false;
        document.getElementById("upgrade-stadium-btn").innerText = "Upgrade Stadion 🏗️";
    } else {
        document.getElementById("fac-stadium-next").innerText = "Level Maksimum";
        document.getElementById("fac-stadium-cost").innerText = "-";
        document.getElementById("upgrade-stadium-btn").disabled = true;
        document.getElementById("upgrade-stadium-btn").innerText = "MAX LEVEL";
    }
    
    // Training facility
    const training = TRAINING_UPGRADES[gameState.trainingLevel - 1];
    document.getElementById("fac-training-level").innerText = `Level ${gameState.trainingLevel} (${training.name})`;
    document.getElementById("fac-training-boost").innerText = `+${Math.round(training.boost*100)/100} rating`;
    
    if (gameState.trainingLevel < TRAINING_UPGRADES.length) {
        const nextTrain = TRAINING_UPGRADES[gameState.trainingLevel];
        document.getElementById("fac-training-next").innerText = `Level Selanjutnya: Level ${gameState.trainingLevel+1} (${nextTrain.name})`;
        document.getElementById("fac-training-cost").innerText = formatMoney(nextTrain.cost);
        document.getElementById("upgrade-training-btn").disabled = false;
        document.getElementById("upgrade-training-btn").innerText = "Upgrade Latihan 🏋️‍♂️";
    } else {
        document.getElementById("fac-training-next").innerText = "Level Maksimum";
        document.getElementById("fac-training-cost").innerText = "-";
        document.getElementById("upgrade-training-btn").disabled = true;
        document.getElementById("upgrade-training-btn").innerText = "MAX LEVEL";
    }
    
    // Youth academy
    const youth = YOUTH_UPGRADES[gameState.youthLevel - 1];
    document.getElementById("fac-youth-level").innerText = `Level ${gameState.youthLevel} (${youth.name})`;
    document.getElementById("fac-youth-progress").innerText = `Pekan ${gameState.youthProgress} / ${youth.interval}`;
    
    if (gameState.youthLevel < YOUTH_UPGRADES.length) {
        const nextYouth = YOUTH_UPGRADES[gameState.youthLevel];
        document.getElementById("fac-youth-next").innerText = `Level Selanjutnya: Level ${gameState.youthLevel+1} (${nextYouth.name})`;
        document.getElementById("fac-youth-cost").innerText = formatMoney(nextYouth.cost);
        document.getElementById("upgrade-youth-btn").disabled = false;
        document.getElementById("upgrade-youth-btn").innerText = "Upgrade Akademi 🎓";
    } else {
        document.getElementById("fac-youth-next").innerText = "Level Maksimum";
        document.getElementById("fac-youth-cost").innerText = "-";
        document.getElementById("upgrade-youth-btn").disabled = true;
        document.getElementById("upgrade-youth-btn").innerText = "MAX LEVEL";
    }
}

// Upgrade click bindings
document.getElementById("upgrade-stadium-btn").addEventListener('click', () => {
    if (gameState.stadiumLevel >= STADIUM_UPGRADES.length) return;
    const nextStad = STADIUM_UPGRADES[gameState.stadiumLevel];
    if (gameState.balance < nextStad.cost) {
        alert("Saldo Anda tidak mencukupi untuk upgrade stadion!");
        return;
    }
    if (confirm(`Upgrade kapasitas stadion menjadi ${nextStad.capacity.toLocaleString()} penonton seharga ${formatMoney(nextStad.cost)}?`)) {
        gameState.balance -= nextStad.cost;
        gameState.stadiumLevel++;
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Manajer Stadion",
            time: `Pekan ${gameState.week}`,
            subject: `Pembangunan Stadion Selesai`,
            body: `Pekerjaan konstruksi stadion telah rampung. Kapasitas stadion Garuda United kini meningkat menjadi ${nextStad.capacity.toLocaleString()} penonton, siap menampung lebih banyak pendukung setia kita di laga kandang berikutnya.`,
            read: false
        });
        
        saveGame();
        updateUI();
    }
});

document.getElementById("upgrade-training-btn").addEventListener('click', () => {
    if (gameState.trainingLevel >= TRAINING_UPGRADES.length) return;
    const nextTrain = TRAINING_UPGRADES[gameState.trainingLevel];
    if (gameState.balance < nextTrain.cost) {
        alert("Saldo Anda tidak mencukupi untuk upgrade fasilitas latihan!");
        return;
    }
    if (confirm(`Tingkatkan fasilitas latihan ke Level ${gameState.trainingLevel+1} (${nextTrain.name}) seharga ${formatMoney(nextTrain.cost)}?`)) {
        gameState.balance -= nextTrain.cost;
        gameState.trainingLevel++;
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Pelatih Kepala",
            time: `Pekan ${gameState.week}`,
            subject: `Fasilitas Latihan Ditingkatkan`,
            body: `Terima kasih! Alat-alat latihan modern dan laboratorium pemulihan fisik baru telah dipasang. Para pemain muda kita akan berkembang jauh lebih cepat mulai pekan ini.`,
            read: false
        });
        
        saveGame();
        updateUI();
    }
});

document.getElementById("upgrade-youth-btn").addEventListener('click', () => {
    if (gameState.youthLevel >= YOUTH_UPGRADES.length) return;
    const nextYouth = YOUTH_UPGRADES[gameState.youthLevel];
    if (gameState.balance < nextYouth.cost) {
        alert("Saldo Anda tidak mencukupi untuk upgrade akademi pemuda!");
        return;
    }
    if (confirm(`Tingkatkan akademi pemuda ke Level ${gameState.youthLevel+1} (${nextYouth.name}) seharga ${formatMoney(nextYouth.cost)}?`)) {
        gameState.balance -= nextYouth.cost;
        gameState.youthLevel++;
        gameState.youthProgress = 0; // reset progress
        
        gameState.inbox.unshift({
            id: Date.now(),
            sender: "Kepala Pemandu Bakat",
            time: `Pekan ${gameState.week}`,
            subject: `Ekspansi Akademi Pemuda`,
            body: `Jaringan pemandu bakat dan asrama akademi telah diperluas. Kami kini dapat merekrut dan membina bibit-bibit pemain dengan potensi bakat yang jauh lebih hebat!`,
            read: false
        });
        
        saveGame();
        updateUI();
    }
});

function renderFinancesTab() {
    const f = gameState.financesHistory;
    
    document.getElementById("fin-in-tickets").innerText = "+" + formatMoney(f.ticketRevenue);
    document.getElementById("fin-in-sponsors").innerText = "+" + formatMoney(f.sponsorRevenue);
    document.getElementById("fin-in-merch").innerText = "+" + formatMoney(f.merchandiseRevenue);
    document.getElementById("fin-in-transfers").innerText = "+" + formatMoney(f.playerSales);
    
    const totalIn = f.ticketRevenue + f.sponsorRevenue + f.merchandiseRevenue + f.playerSales;
    document.getElementById("fin-in-total").innerText = "+" + formatMoney(totalIn);
    
    document.getElementById("fin-out-wages").innerText = "-" + formatMoney(f.playerWages);
    document.getElementById("fin-out-maintenance").innerText = "-" + formatMoney(f.maintenanceCosts);
    document.getElementById("fin-out-transfers").innerText = "-" + formatMoney(f.playerPurchases);
    
    const totalOut = f.playerWages + f.maintenanceCosts + f.playerPurchases;
    document.getElementById("fin-out-total").innerText = "-" + formatMoney(totalOut);
    
    const profit = totalIn - totalOut;
    const profitText = document.getElementById("fin-weekly-profit");
    profitText.innerText = (profit >= 0 ? "+" : "") + formatMoney(profit);
    profitText.className = profit >= 0 ? "text-emerald" : "text-rose";
    
    document.getElementById("fin-projected-cash").innerText = formatMoney(gameState.balance + profit);
}

// ==========================================
// TACTICS SUB-MODAL LOGIC
// ==========================================
let subSelection = {
    starterId: null,
    benchId: null
};

function openSubModal() {
    subSelection.starterId = null;
    subSelection.benchId = null;
    
    renderSubLists();
    document.getElementById("sub-modal").classList.add("active");
}

function renderSubLists() {
    const startContainer = document.getElementById("sub-starting-list");
    const benchContainer = document.getElementById("sub-bench-list");
    
    startContainer.innerHTML = "";
    benchContainer.innerHTML = "";
    
    const { starters, bench } = getStartingEleven();
    
    // starting
    starters.forEach(p => {
        const item = document.createElement("div");
        item.className = "sub-player-item" + (subSelection.starterId === p.id ? " selected" : "");
        
        let posClass = "pos-gk";
        if (p.position === "DF") posClass = "pos-df";
        else if (p.position === "MF") posClass = "pos-mf";
        else if (p.position === "FW") posClass = "pos-fw";
        
        item.innerHTML = `
            <div class="sub-player-left">
                <span class="sub-p-pos ${posClass}">${p.position}</span>
                <span class="sub-p-name">${p.name}</span>
            </div>
            <div class="sub-player-right">
                <span class="sub-p-rating">${p.rating}</span>
                <span class="sub-p-energy">🔌 ${p.energy}%</span>
            </div>
        `;
        item.addEventListener('click', () => {
            subSelection.starterId = p.id;
            renderSubLists();
        });
        startContainer.appendChild(item);
    });
    
    // bench
    bench.forEach(p => {
        const item = document.createElement("div");
        item.className = "sub-player-item" + (subSelection.benchId === p.id ? " selected" : "");
        
        let posClass = "pos-gk";
        if (p.position === "DF") posClass = "pos-df";
        else if (p.position === "MF") posClass = "pos-mf";
        else if (p.position === "FW") posClass = "pos-fw";
        
        let statusText = `🔌 ${p.energy}%`;
        if (p.injured > 0) statusText = `🚑 OUT ${p.injured}W`;
        else if (p.suspended) statusText = `🟥 SUSP`;
        
        item.innerHTML = `
            <div class="sub-player-left">
                <span class="sub-p-pos ${posClass}">${p.position}</span>
                <span class="sub-p-name">${p.name}</span>
            </div>
            <div class="sub-player-right">
                <span class="sub-p-rating">${p.rating}</span>
                <span class="sub-p-energy">${statusText}</span>
            </div>
        `;
        
        // Prevent picking injured/suspended bench players
        if (p.injured === 0 && !p.suspended) {
            item.addEventListener('click', () => {
                subSelection.benchId = p.id;
                renderSubLists();
            });
        } else {
            item.style.opacity = 0.5;
            item.style.cursor = 'not-allowed';
        }
        
        benchContainer.appendChild(item);
    });
}

document.getElementById("confirm-sub-btn").addEventListener('click', () => {
    const sid = subSelection.starterId;
    const bid = subSelection.benchId;
    
    if (!sid || !bid) {
        alert("Pilih satu pemain utama dan satu pemain cadangan untuk ditukar!");
        return;
    }
    
    // Modify activeMatch teams roster mid-game if simulated or edit squad
    // Since getStartingEleven picks players dynamically based on rating and position:
    // To implement a user-forced swap, we can swap their rating or slightly modify their positions,
    // OR we swap them in the active match list directly:
    const startIdx = activeMatch.starters.findIndex(p => p.id === sid);
    const benchIdx = activeMatch.bench.findIndex(p => p.id === bid);
    
    if (startIdx !== -1 && benchIdx !== -1) {
        const starter = activeMatch.starters[startIdx];
        const bencher = activeMatch.bench[benchIdx];
        
        // Swap
        activeMatch.starters[startIdx] = bencher;
        activeMatch.bench[benchIdx] = starter;
        
        // Log in match highlights
        addCommentaryItem(`🔄 ${activeMatch.minute}' - PERGANTIAN PEMAIN: ${starter.name} keluar, digantikan oleh ${bencher.name}.`, "system");
        
        // Also apply it to the main squad list so it carries over
        // Since starters are calculated by sorting available players, let's swap their priority or make a custom priority list.
        // A simple trick to keep custom lineups is to temporarily swap ratings or ages so the algorithm picks the new starter,
        // or just accept it for the current match. Since activeMatch starters/bench are copied, doing this supports live in-game changes.
        // To make it stick, let's also swap them in the gameState squad array!
        // We find the two players in gameState.squad and swap their position/ratings slightly or order in the list:
        // Wait, since they are sorted by rating, swapping their rating might affect strength.
        // Let's swap their ratings/values slightly or just keep it as an active match override, and after the match,
        // the energy adjustments will naturally keep the tired player on the bench next week! Yes! The tired starter will have low energy,
        // so the manager setup will naturally bench him because of low fitness! That is perfect.
    }
    
    document.getElementById("sub-modal").classList.remove("active");
});

document.getElementById("cancel-sub-btn").addEventListener('click', () => {
    document.getElementById("sub-modal").classList.remove("active");
});

// ==========================================
// BIND DOM EVENT HANDLERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Load Game
    loadOrSetupDefault();
    
    // Check if player has completed setup
    const isNew = !safeStorage.getItem("gaffers_league_save");
    if (isNew) {
        document.getElementById("setup-overlay").classList.add("active");
    } else {
        document.getElementById("setup-overlay").classList.remove("active");
        updateUI();
    }
    
    // Setup tabs navigation
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute("data-tab");
            
            navItems.forEach(n => n.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(tabId).classList.add("active");
            
            // Special updates
            if (tabId === "tab-standings") recalculateStandings();
            
            updateUI();
        });
    });
    
    // Setup form submit
    document.getElementById("start-game-btn").addEventListener('click', () => {
        const mName = document.getElementById("manager-name").value.trim() || "Coach Gaffer";
        const tName = document.getElementById("team-name").value.trim() || "Garuda United";
        const diff = document.getElementById("difficulty-level").value;
        
        setupNewGame(mName, tName, diff);
        document.getElementById("setup-overlay").classList.remove("active");
        updateUI();
    });
    
    // Reset Game button
    document.getElementById("reset-career-btn").addEventListener('click', () => {
        if (confirm("Apakah Anda yakin ingin menghapus seluruh data karir Anda saat ini dan memulai ulang dari Pekan 1?")) {
            safeStorage.removeItem("gaffers_league_save");
            document.getElementById("setup-overlay").classList.add("active");
        }
    });
    
    // Tactic details inputs change binding
    document.getElementById("tactic-formation").addEventListener('change', (e) => {
        gameState.tactic.formation = e.target.value;
        saveGame();
        updateUI();
    });
    
    document.getElementById("tactic-mentality").addEventListener('change', (e) => {
        gameState.tactic.mentality = e.target.value;
        saveGame();
        updateUI();
    });
    
    document.getElementById("tactic-captain").addEventListener('change', (e) => {
        gameState.tactic.captainId = e.target.value;
        saveGame();
    });
    
    document.getElementById("tactic-penalty").addEventListener('change', (e) => {
        gameState.tactic.penaltyId = e.target.value;
        saveGame();
    });
    
    // Schedule filtering week selection
    document.getElementById("schedule-filter-week").addEventListener('change', (e) => {
        renderFilteredSchedule(parseInt(e.target.value));
    });
    
    // Refresh transfer market manually
    document.getElementById("refresh-market-btn").addEventListener('click', () => {
        refreshTransferMarket(false);
    });
    
    // Play Match button Click trigger
    document.getElementById("play-match-btn").addEventListener('click', () => {
        if (!gameState.schedule || !gameState.schedule[gameState.week - 1]) return;
        const currentMatches = gameState.schedule[gameState.week - 1];
        const userMatch = currentMatches.find(m => m.homeTeam === gameState.teamName || m.awayTeam === gameState.teamName);
        if (userMatch) {
            const isHome = userMatch.homeTeam === gameState.teamName;
            const oppName = isHome ? userMatch.awayTeam : userMatch.homeTeam;
            startMatchSimulation(oppName, isHome);
        }
    });
    
    // In-game simulation Speed controllers
    const speedBtns = [
        document.getElementById("mc-speed-1"),
        document.getElementById("mc-speed-2"),
        document.getElementById("mc-speed-3"),
        document.getElementById("mc-speed-instant")
    ];
    
    speedBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            speedBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const speeds = [1, 2, 3, 999];
            activeMatch.speed = speeds[idx];
        });
    });
    
    // In-game substitution button
    document.getElementById("mc-make-sub-btn").addEventListener('click', () => {
        openSubModal();
    });
    
    // Audio mute button
    document.getElementById("mc-mute-btn").addEventListener('click', (e) => {
        soundMuted = !soundMuted;
        e.target.innerText = soundMuted ? "🔇 Mute" : "🔊 Suara";
        if (soundMuted) {
            stopCrowdSound();
        } else {
            startCrowdSound();
        }
    });
    
    // Exit match report trigger
    document.getElementById("mc-exit-btn").addEventListener('click', () => {
        document.getElementById("match-center").classList.remove("active");
        document.getElementById("post-match-overlay").classList.remove("active");
        advanceWeek();
    });
});
