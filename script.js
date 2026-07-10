// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB7GEG6gSDRBxKFmuo0iG_wt-IsTaDyHWU",
  authDomain: "test-aa50d.firebaseapp.com",
  databaseURL: "https://test-aa50d-default-rtdb.firebaseio.com",
  projectId: "test-aa50d",
  storageBucket: "test-aa50d.firebasestorage.app",
  messagingSenderId: "160629020295",
  appId: "1:160629020295:web:d2d3e98690b729a7f68a22"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let authUid = null;
firebase.auth().signInAnonymously()
  .then(() => {
    authUid = firebase.auth().currentUser.uid;
    const msg = document.getElementById('auth-status');
    msg.innerText = "Đã kết nối bảo mật thành công!";
    msg.style.color = "var(--success)";
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  })
  .catch((error) => {
    document.getElementById('auth-status').innerText = "Lỗi kết nối bảo mật: " + error.message;
    console.error(error);
  });

// ==========================================
// 2. AUDIO SYSTEM (SFX)
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    
    if (type === 'click') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'correct') {
        osc.type = 'square'; osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.1); osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'win') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.15); osc.frequency.setValueAtTime(659.25, now + 0.3);
        osc.frequency.setValueAtTime(880, now + 0.45);
        gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.start(now); osc.stop(now + 1.5);
    }
}

document.addEventListener('click', (e) => {
    initAudio();
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn') || e.target.classList.contains('option-btn')) {
        if (!e.target.classList.contains('correct') && !e.target.classList.contains('wrong')) playSound('click');
    }
});

// ==========================================
// 3. GAME STATE & QUESTIONS
// ==========================================
let currentRoomCode = null;
let isTeacher = false;
let myPlayerId = null;
let currentQuestionIndex = 0;
let myScore = 0;
let myCombo = 0;
let questionStartTime = 0;
let globalPlayersArray = []; 
let teacherPlayerStates = {};

const questions = [
    { q: "1. If you ______ breakfast, you will have energy all morning.", opts: ["A. eat", "B. will eat", "C. eating"], a: 0 },
    { q: "2. breathe / if / slowly / you / down / , / you / will / calm / .", opts: ["A. If you breathe slowly, you will calm down.", "B. If you will breathe slowly, you calm down.", "C. You breathe if slowly, you will calm down."], a: 0 },
    { q: "3. If Chloe sits up straight at her desk, her back ______ during the long exam.", opts: ["A. won't hurt", "B. don't hurt", "C. will hurt"], a: 0 },
    { q: "4. If Chloe listens to soft music while reviewing, ______.", opts: ["A. she feels less stressed", "B. she will feel less stressed", "C. she will feels less stressed"], a: 1 },
    { q: "5. If you stare at your phone screen for hours, your eyes ______ fresh tomorrow.", opts: ["A. will feel", "B. don’t feel", "C. won't feel"], a: 2 },
    { q: "6. Which sentence is WRONG?", opts: ["A. If he plays with his dog after studying, he will feel relaxed.", "B. If we laugh with friends, we will forget our stress.", "C. If she will chew gum in the exam, she focuses better."], a: 2 },
    { q: "7. ______, you will remember the formulas better.", opts: ["A. If you check your notes one more time", "B. If you will check your notes one more time", "C. If you checking your notes one more time"], a: 0 },
    { q: "8. to school / fresh air / if / they / walk / , / will / wake up / their brains", opts: ["A. They walk to school if fresh air will wake up their brains.", "B. If they walk to school, fresh air will wake up their brains.", "C. If they will walk to school, fresh air wakes up their brains."], a: 1 },
    { q: "9. The whole class ______ more confident if everyone ______ each other before the exam.", opts: ["A. will feel / encourages", "B. feels / will encourage", "C. will feel / encourage"], a: 0 },
    { q: "10. too / snacks / stomachs / if / students / eat / , / many / their / will / hurt / .", opts: ["A. Students eat too many snacks if their stomachs will hurt.", "B. If students will eat too many snacks, their stomachs hurt.", "C. If students eat too many snacks, their stomachs will hurt."], a: 2 }
];

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex); currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ==========================================
// 4. TEACHER LOGIC
// ==========================================
document.getElementById('btn-teacher-role').addEventListener('click', async () => { 
    if (!authUid) { alert("Chưa kết nối được bảo mật Firebase. Vui lòng đợi hoặc tải lại trang."); return; }
    isTeacher = true;
    
    // Auto Create Room
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let code = '';
    for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    currentRoomCode = code;
    
    try {
        await db.ref('rooms/' + currentRoomCode).set({
            hostId: authUid,
            status: 'waiting', 
            energy: 10,
            announcement: ''
        });
        
        setupTeacherRealtimeListeners();
        showScreen('screen-teacher-dashboard');
        document.getElementById('td-room-code').innerText = currentRoomCode;
    } catch (error) {
        alert("Lỗi Firebase: " + error.message);
    }
});

document.getElementById('btn-student-role').addEventListener('click', () => { isTeacher = false; showScreen('screen-student-lobby'); });

// Teacher Actions in Dashboard
document.getElementById('btn-start-game').addEventListener('click', async () => {
    try {
        await db.ref(`rooms/${currentRoomCode}`).update({ status: 'playing' });
        document.getElementById('btn-start-game').style.display = 'none';
        playSound('correct');
    } catch(e) { alert("Lỗi: " + e.message); }
});

document.getElementById('btn-send-announcement').addEventListener('click', async () => {
    const text = document.getElementById('input-announcement').value.trim();
    if (text && currentRoomCode) {
        try {
            await db.ref(`rooms/${currentRoomCode}`).update({ announcement: text });
            document.getElementById('input-announcement').value = '';
        } catch(e) { alert("Bạn không có quyền (hostId sai) hoặc bị lỗi: " + e.message); }
    }
});

document.getElementById('btn-end-game').addEventListener('click', async () => {
    if(confirm('Bạn có chắc chắn muốn kết thúc game và hiển thị Bảng Vàng không?')) {
        try { await db.ref(`rooms/${currentRoomCode}`).update({ status: 'ended' }); } 
        catch(e) { alert("Lỗi: " + e.message); }
    }
});

function showTeacherToast(message) {
    const container = document.getElementById('teacher-toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function setupTeacherRealtimeListeners() {
    db.ref(`rooms/${currentRoomCode}/players`).on('value', (snapshot) => {
        const playersData = snapshot.val();
        const list = document.getElementById('td-student-list');
        list.innerHTML = '';
        
        globalPlayersArray = [];
        if (!playersData) { document.getElementById('td-student-count').innerText = "0"; return; }

        for (const [id, data] of Object.entries(playersData)) {
            globalPlayersArray.push({id, ...data});
            
            // Notification logic
            if (data.finished && !teacherPlayerStates[id]) {
                showTeacherToast(`🎉 ${data.name} đã làm bài xong!`);
                playSound('click');
            }
            teacherPlayerStates[id] = data.finished || false;
        }
        document.getElementById('td-student-count').innerText = globalPlayersArray.length;
        
        globalPlayersArray.sort((a, b) => b.score - a.score);
        globalPlayersArray.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${p.name} ${p.combo >= 3 ? '🔥' : ''} ${p.finished ? '✅' : ''}</span> <span>${p.score}đ</span>`;
            list.appendChild(li);
        });
    });

    db.ref(`rooms/${currentRoomCode}/energy`).on('value', (snapshot) => {
        let energy = snapshot.val() || 10;
        document.getElementById('td-energy').innerText = Math.floor(energy) + "%";
    });
    
    db.ref(`rooms/${currentRoomCode}/status`).on('value', (snapshot) => {
        if (snapshot.val() === 'ended') triggerEndGame();
    });
}

// ==========================================
// 5. STUDENT LOGIC
// ==========================================
document.getElementById('btn-join-room').addEventListener('click', async () => {
    if (!authUid) { alert("Chưa kết nối được bảo mật Firebase. Vui lòng đợi hoặc tải lại trang."); return; }
    
    const codeInput = document.getElementById('input-room-code').value.toUpperCase().trim();
    const nameInput = document.getElementById('input-student-name').value.trim();
    const msg = document.getElementById('student-lobby-msg');

    if (codeInput.length !== 4 || nameInput.length === 0) { msg.innerText = "Mã phòng không hợp lệ hoặc thiếu tên."; return; }

    try {
        const snapshot = await db.ref(`rooms/${codeInput}`).get();
        if (!snapshot.exists()) { msg.innerText = "Không tìm thấy phòng này!"; return; }

        currentRoomCode = codeInput;
        myPlayerId = authUid;

        await db.ref(`rooms/${currentRoomCode}/players/${myPlayerId}`).set({
            name: nameInput, score: 0, combo: 0, frozenUntil: 0, finished: false
        });

        document.getElementById('btn-join-room').classList.add('hidden');
        document.getElementById('input-room-code').disabled = true;
        document.getElementById('input-student-name').disabled = true;
        msg.innerText = "";
        document.getElementById('waiting-area').classList.remove('hidden');

        db.ref(`rooms/${currentRoomCode}/status`).on('value', (snapshot) => {
            const stat = snapshot.val();
            if (stat === 'playing') {
                if (document.getElementById('screen-student-lobby').classList.contains('active')) {
                    setupRealtimeListeners();
                    showScreen('screen-game');
                    loadQuestion();
                }
            } else if (stat === 'ended') {
                triggerEndGame();
            }
        });
        
    } catch (error) {
        console.error("Firebase Error: ", error);
        msg.innerText = "Lỗi kết nối Firebase: " + error.message;
    }
});

// ==========================================
// 6. SABOTAGE (FREEZE) LOGIC
// ==========================================
document.getElementById('btn-freeze-attack').addEventListener('click', async () => {
    if (myCombo < 3) return;
    const targetPlayer = globalPlayersArray.find(p => p.id !== myPlayerId);
    
    if (targetPlayer) {
        await db.ref(`rooms/${currentRoomCode}/players/${targetPlayer.id}`).update({ frozenUntil: Date.now() + 4000 });
        myCombo -= 3; updateComboUI();
        
        const feedback = document.getElementById('feedback-msg');
        feedback.innerText = `❄️ Đã đóng băng ${targetPlayer.name}!`; feedback.style.color = "#00cec9";
        
        if (typeof confetti !== "undefined") confetti({ particleCount: 50, spread: 60, colors: ['#00cec9', '#74b9ff', '#ffffff'] });
    }
});

function updateComboUI() {
    const comboEl = document.getElementById('combo-display');
    if (myCombo > 0) {
        comboEl.classList.remove('combo-hidden'); comboEl.innerText = `COMBO x${myCombo} 🔥`;
        comboEl.style.transform = `scale(${1 + (myCombo * 0.1)})`;
    } else { comboEl.classList.add('combo-hidden'); }
    
    const freezeBtn = document.getElementById('btn-freeze-attack');
    if (myCombo >= 3) freezeBtn.classList.remove('hidden'); else freezeBtn.classList.add('hidden');
}

// ==========================================
// 7. GAMEPLAY LOGIC (SPEED & COMBO)
// ==========================================
function loadQuestion() {
    if (currentQuestionIndex >= questions.length) {
        if (!window.hasFinishedGame) {
            window.hasFinishedGame = true;
            db.ref(`rooms/${currentRoomCode}/players/${myPlayerId}`).update({ finished: true });
        }
        document.getElementById('question-text').innerText = "🎉 Bạn đã hoàn thành tất cả câu hỏi! Hãy chờ các bạn khác để cùng đẩy thanh năng lượng nhé.";
        document.getElementById('options-container').innerHTML = '';
        document.getElementById('feedback-msg').innerText = '';
        document.getElementById('combo-display').classList.add('combo-hidden');
        document.getElementById('btn-freeze-attack').classList.add('hidden');
        return;
    }
    
    const qData = questions[currentQuestionIndex];
    document.getElementById('question-text').innerText = qData.q;
    const optionsContainer = document.getElementById('options-container'); optionsContainer.innerHTML = '';
    document.getElementById('feedback-msg').innerText = '';
    
    questionStartTime = Date.now();
    qData.opts.forEach((optText, index) => {
        const btn = document.createElement('button'); btn.className = 'option-btn'; btn.innerText = optText;
        btn.onclick = () => handleAnswer(index, qData.a, btn);
        optionsContainer.appendChild(btn);
    });
}

async function handleAnswer(selectedIndex, correctIndex, btnElement) {
    const buttons = document.querySelectorAll('.option-btn'); buttons.forEach(b => b.disabled = true);
    const feedback = document.getElementById('feedback-msg');
    const elapsedSeconds = (Date.now() - questionStartTime) / 1000;
    let timeScore = Math.max(2, 10 - Math.floor(elapsedSeconds));

    if (selectedIndex === correctIndex) {
        playSound('correct'); btnElement.classList.add('correct');
        myCombo += 1; let pointsEarned = timeScore * myCombo; myScore += pointsEarned;
        
        feedback.innerText = `Tuyệt! +${pointsEarned}đ (Tốc độ: ${timeScore} x Combo: ${myCombo})`;
        feedback.style.color = "var(--success)";
        
        if (typeof confetti !== "undefined" && (myCombo === 3 || myCombo === 5)) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        updateComboUI();
        
        await db.ref(`rooms/${currentRoomCode}/players/${myPlayerId}`).update({ score: myScore, combo: myCombo });
        
        let playerCount = Math.max(1, globalPlayersArray.length);
        let energyIncrement = 90 / (playerCount * 8); 
        await db.ref(`rooms/${currentRoomCode}`).update({ energy: firebase.database.ServerValue.increment(energyIncrement) });
    } else {
        playSound('wrong'); btnElement.classList.add('wrong'); buttons[correctIndex].classList.add('correct');
        myCombo = 0; myScore = Math.max(0, myScore - 3);
        
        feedback.innerText = "Sai rồi! Trừ 3 điểm!"; feedback.style.color = "var(--danger)";
        const container = document.getElementById('game-container'); container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 500);
        
        updateComboUI();
        await db.ref(`rooms/${currentRoomCode}/players/${myPlayerId}`).update({ score: myScore, combo: myCombo });
    }

    setTimeout(() => { 
        currentQuestionIndex++;
        loadQuestion(); 
    }, 1500);
}

// ==========================================
// 8. REAL-TIME LISTENERS (STUDENT)
// ==========================================
function setupRealtimeListeners() {
    db.ref(`rooms/${currentRoomCode}/announcement`).on('value', (snapshot) => {
        const text = snapshot.val();
        if (text) {
            const banner = document.getElementById('push-banner');
            document.getElementById('banner-text').innerText = text;
            banner.classList.remove('hidden');
            playSound('click');
            setTimeout(() => { banner.classList.add('hidden'); }, 5000);
        }
    });

    db.ref(`rooms/${currentRoomCode}/players`).on('value', (snapshot) => {
        const playersData = snapshot.val();
        if (!playersData) return;

        globalPlayersArray = [];
        for (const [id, data] of Object.entries(playersData)) globalPlayersArray.push({ id, ...data });
        globalPlayersArray.sort((a, b) => b.score - a.score);

        if (myPlayerId && playersData[myPlayerId]) {
            const myData = playersData[myPlayerId];
            const freezeOverlay = document.getElementById('freeze-overlay');
            if (myData.frozenUntil > Date.now()) {
                freezeOverlay.classList.remove('hidden');
                setTimeout(() => { freezeOverlay.classList.add('hidden'); }, myData.frozenUntil - Date.now());
            } else { freezeOverlay.classList.add('hidden'); }
        }

        const list = document.getElementById('leaderboard-list'); list.innerHTML = '';
        globalPlayersArray.forEach((p, index) => {
            const li = document.createElement('li'); li.className = 'lb-item';
            if (p.id === myPlayerId) li.classList.add('me');
            if (p.frozenUntil > Date.now()) li.classList.add('frozen-lb');

            let rankIcon = `#${index + 1}`;
            if (index === 0) rankIcon = '🥇'; if (index === 1) rankIcon = '🥈'; if (index === 2) rankIcon = '🥉';
            let comboIcon = p.combo >= 3 ? '🔥' : ''; let freezeIcon = p.frozenUntil > Date.now() ? '🥶' : '';
            li.innerHTML = `<span>${rankIcon} ${p.name} ${comboIcon} ${freezeIcon}</span><span>${p.score} pts</span>`;
            list.appendChild(li);
        });
    });

    db.ref(`rooms/${currentRoomCode}/energy`).on('value', (snapshot) => {
        let energy = snapshot.val() || 10;
        if (energy > 100) energy = 100;
        
        let displayEnergy = Math.floor(energy);

        document.getElementById('energy-text').innerText = displayEnergy + "%";
        document.getElementById('energy-fill').style.width = displayEnergy + "%";

        const face = document.getElementById('chloe-face');
        if (energy < 40) face.src = "assets/chloe_worried.png";
        else if (energy < 80) face.src = "assets/chloe_neutral.png";
        else if (energy < 100) face.src = "assets/chloe_happy.png";
        else {
            face.src = "assets/chloe_success.png";
            if (document.getElementById('success-overlay').classList.contains('hidden')) {
                triggerEndGame();
            }
        }
    });
}

function triggerEndGame() {
    if (!document.getElementById('success-overlay').classList.contains('hidden')) return;
    playSound('win');
    if (typeof confetti !== "undefined") confetti({ particleCount: 300, spread: 100, origin: { y: 0.5 } });
    renderFinalLeaderboard();
    document.getElementById('success-overlay').classList.remove('hidden');
    document.getElementById('success-title').innerText = "TRÒ CHƠI KẾT THÚC!";
    document.getElementById('success-subtitle').innerText = "Giáo viên đã dừng bài kiểm tra!";
}

function renderFinalLeaderboard() {
    const container = document.getElementById('final-top-players'); container.innerHTML = '';
    const top3 = globalPlayersArray.slice(0, 3);
    const podiumOrder = [];
    if (top3[1]) podiumOrder.push({ rank: 2, p: top3[1], icon: '🥈' });
    if (top3[0]) podiumOrder.push({ rank: 1, p: top3[0], icon: '🏆' });
    if (top3[2]) podiumOrder.push({ rank: 3, p: top3[2], icon: '🥉' });
    
    podiumOrder.forEach(item => {
        const div = document.createElement('div'); div.className = `top-player rank-${item.rank}`;
        div.innerHTML = `<div class="podium-icon">${item.icon}</div><div class="podium-name">${item.p.name}</div><div class="podium-score">${item.p.score} pts</div>`;
        container.appendChild(div);
    });
}
