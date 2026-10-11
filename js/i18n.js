// Chinese / English text and the story. ?lang=zh|en from the lobby wins, then the saved choice, then the browser.
const q = (typeof location !== 'undefined' && location.search.match(/[?&]lang=(zh|en)(?![a-z])/)) || null;
let lang = q ? q[1] : null;
try { if (lang) localStorage.setItem('msc_lang', lang); else lang = localStorage.getItem('msc_lang'); } catch (e) { /* storage blocked */ }
if (lang !== 'zh' && lang !== 'en') lang = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
export const getLang = () => lang;
export function setLang(l) { lang = l; try { localStorage.setItem('msc_lang', l); } catch (e) { /* ignore */ } }
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en);

const S = {
  title: { zh: '月影城', en: 'Moonshadow Castle' },
  subtitle: { zh: '夜之狂想曲', en: 'Rhapsody of the Night' },
  newGame: { zh: '新的旅程', en: 'New Game' }, cont: { zh: '繼續', en: 'Continue' }, howTo: { zh: '操作說明', en: 'Controls' },
  lobby: { zh: '回遊戲大廳', en: 'Game Lobby' },
  overwrite: { zh: '開始新遊戲會覆蓋目前的存檔，確定嗎？', en: 'A new game will overwrite your save. Are you sure?' },
  yes: { zh: '確定', en: 'Yes' }, no: { zh: '取消', en: 'Cancel' }, close: { zh: '關閉', en: 'Close' }, back: { zh: '返回', en: 'Back' },
  controlsKb: { zh: '鍵盤：←→ 移動　↓ 蹲下　Z / 空白 跳躍　X 攻擊　↑+X 或 C 副武器　A 後跳　S 變身蝙蝠　Enter 選單　M 地圖',
    en: 'Keyboard: ←→ move · ↓ crouch · Z / Space jump · X attack · ↑+X or C sub-weapon · A backdash · S bat form · Enter menu · M map' },
  controlsTouch: { zh: '觸控：左下方向鍵，右下 跳 / 攻 / 副 / 退 / 蝠 按鈕，右上 選單與地圖', en: 'Touch: d-pad bottom left; jump / attack / sub / dash / bat buttons bottom right; menu and map top right' },
  controlsTips: { zh: '↓ + 跳：從平台跳下（有影之披風時在地面是滑鏟）。碰到紅色的棺木雕像會存檔並回滿血。打破燭台可以拿到愛心與金幣。',
    en: 'Down + jump: drop through a ledge (with the Shadow Cloak, a slide on solid ground). Touch a red coffin statue to save and heal. Break candles for hearts and gold.' },
  // HUD / menus
  lv: { zh: 'Lv', en: 'Lv' }, hp: { zh: 'HP', en: 'HP' }, mp: { zh: 'MP', en: 'MP' },
  status: { zh: '狀態', en: 'Status' }, equipT: { zh: '裝備', en: 'Equip' }, itemsT: { zh: '道具', en: 'Items' }, mapT: { zh: '地圖', en: 'Map' }, sysT: { zh: '系統', en: 'System' },
  atk: { zh: '攻擊', en: 'ATK' }, def: { zh: '防禦', en: 'DEF' }, str: { zh: '力量', en: 'STR' }, con: { zh: '體質', en: 'CON' }, lck: { zh: '幸運', en: 'LCK' },
  exp: { zh: '經驗值', en: 'EXP' }, next: { zh: '下一級', en: 'Next' }, gold: { zh: '金幣', en: 'Gold' }, hearts: { zh: '愛心', en: 'Hearts' },
  kills: { zh: '擊敗數', en: 'Kills' }, time: { zh: '遊戲時間', en: 'Play time' }, explored: { zh: '探索度', en: 'Explored' },
  weapon: { zh: '武器', en: 'Weapon' }, armor: { zh: '防具', en: 'Armor' }, acc: { zh: '飾品', en: 'Accessory' }, none: { zh: '（無）', en: '(none)' },
  sub: { zh: '副武器', en: 'Sub-weapon' }, relics: { zh: '聖遺物', en: 'Relics' }, equipped: { zh: '裝備中', en: 'Equipped' },
  use: { zh: '使用', en: 'Use' }, noItems: { zh: '沒有道具。', en: 'No items.' },
  buy: { zh: '購買', en: 'Buy' }, sell: { zh: '賣出', en: 'Sell' }, shopT: { zh: '圖書館員的店', en: "The Librarian's Shop" }, have: { zh: '持有', en: 'Have' },
  noGold: { zh: '金幣不夠。', en: 'Not enough gold.' }, bought: { zh: '買下了！', en: 'Bought!' }, sold: { zh: '賣出了。', en: 'Sold.' },
  saved: { zh: '已存檔，HP / MP 全回復', en: 'Game saved · HP / MP restored' },
  got: { zh: '得到', en: 'Got' }, gotSub: { zh: '副武器：', en: 'Sub-weapon: ' }, levelUp: { zh: '等級提升！', en: 'Level up!' },
  secretFound: { zh: '牆壁崩塌了……發現了秘密房間！', en: 'The wall crumbled... a secret room!' },
  catacombsHint: { zh: '地下墓穴……一路往下走，深處好像有什麼在發光。', en: 'The catacombs... something glows deep below.' },
  gameOver: { zh: '你倒下了……', en: 'You have fallen...' }, retry: { zh: '從存檔點再來', en: 'Retry from save' }, toTitle: { zh: '回標題', en: 'Title screen' },
  relicGot: { zh: '得到聖遺物', en: 'Relic obtained' },
  pause: { zh: '暫停', en: 'Paused' }, resume: { zh: '回到遊戲', en: 'Resume' }, sound: { zh: '音效 / 音樂', en: 'Sound / music' }, on: { zh: '開', en: 'On' }, off: { zh: '關', en: 'Off' },
  language: { zh: '語言', en: 'Language' }, quit: { zh: '存檔並回標題', en: 'Save & quit to title' },
  mapHelp: { zh: '紅色：存檔室　黃色：商店　紫色：魔王　● 你的位置', en: 'Red: save room · Yellow: shop · Purple: boss · ● You' },
  theEnd: { zh: '完', en: 'THE END' }, clearTime: { zh: '通關時間', en: 'Clear time' }, deaths: { zh: '倒下次數', en: 'Falls' },
  tapToContinue: { zh: '點一下繼續', en: 'Tap to continue' },
  dash: { zh: '退', en: 'Dash' }, batBtn: { zh: '蝠', en: 'Bat' }, jumpBtn: { zh: '跳', en: 'Jump' }, atkBtn: { zh: '攻', en: 'Atk' }, subBtn: { zh: '副', en: 'Sub' },
};
export const t = (k) => L(S[k]) || k;

// ------------------------------------------------------------------ story
const W = { lucien: { zh: '路西安', en: 'Lucien' }, oswin: { zh: '圖書館員 奧斯溫', en: 'Oswin the Librarian' }, elise: { zh: '艾莉絲', en: 'Elise' },
  count: { zh: '伯爵 沃拉斯', en: 'Count Vorlath' }, witch: { zh: '魔女 莫莉甘', en: 'Morrigan' }, sentinel: { zh: '鋼鐵哨兵', en: 'Iron Sentinel' }, nar: null };
const D = (who, zh, en) => ({ who: W[who], zh, en });
export const STORY = {
  intro: [
    D('nar', '每隔一百年，月亮會在月影城的上空變黑。', 'Once every hundred years, the moon turns black above Moonshadow Castle.'),
    D('nar', '那一夜，城主──吸血鬼伯爵沃拉斯──會醒來，舉行「蝕月之儀」，想讓黑夜永遠不再結束。', 'On that night its master, the vampire Count Vorlath, awakens to perform the Eclipse Rite, and make the night endless.'),
    D('nar', '儀式需要月之巫女的血。三天前，巫女的後代──艾莉絲──從村子裡消失了。', 'The rite needs the blood of a moon priestess. Three days ago, the last of that line, Elise, vanished from her village.'),
    D('lucien', '艾莉絲……我的妹妹。等我，我一定會帶妳回家。', 'Elise... little sister. Hold on. I am bringing you home.'),
    D('nar', '銀髮的劍士路西安，帶著母親留下的短劍，踏進了城門。', 'Lucien, the silver-haired swordsman, steps through the castle gate with nothing but his mother’s short sword.'),
  ],
  boss_greatbat: [D('nar', '天花板上的陰影動了起來──是一隻巨大的蝙蝠！', 'The shadows on the ceiling shift and unfold... a giant bat!')],
  boss_golem: [D('nar', '一千名士兵的骸骨，在黑暗中組成了一個巨人。', 'The bones of a thousand fallen soldiers rise and lock together into a giant.')],
  boss_witch: [
    D('witch', '哎呀，伯爵大人的客人？不請自來可是很沒禮貌的喔，小月之子。', 'Oh my, a guest of the Count? Arriving uninvited is so very rude, little moonchild.'),
    D('lucien', '把影之披風交出來，我就不砍妳。', 'Hand over the Shadow Cloak and I won’t have to cut you down.'),
    D('witch', '呵呵，那就來試試看吧！', 'Ha! Then come and try!'),
  ],
  boss_sentinel: [D('sentinel', '偵測到入侵者。執行程序：殲滅。', 'INTRUDER DETECTED. PROTOCOL: ERADICATE.')],
  boss_count: [
    D('count', '路西安。我等你很久了。', 'Lucien. I have waited a long time for you.'),
    D('lucien', '艾莉絲在哪裡！', 'Where is Elise!'),
    D('count', '在祭壇上安睡。不過你知道嗎？你身上流著和她一樣的月之血。', 'Asleep upon the altar. But did you know? The same moon blood runs in your veins.'),
    D('count', '有了你們兩個人，蝕月就永遠不會結束。黑夜將屬於我！', 'With both of you, the eclipse will never end. The night will be mine forever!'),
    D('lucien', '那就讓這把劍，替月亮回答你。', 'Then let this blade answer for the moon.'),
  ],
  count2: [
    D('count', '夠了！讓你見識蝕月真正的力量！', 'Enough! Behold the true power of the eclipse!'),
  ],
  librarian: [
    D('oswin', '哦？客人！三百年來第一位客人！', 'Oh? A visitor! My first in three hundred years!'),
    D('oswin', '我是這座城的圖書館員，被這些書困在這裡。伯爵？他在城頂的王座之塔。', 'I am the castle librarian, bound to these books. The Count? He waits atop the Keep.'),
    D('oswin', '要上去，你得找到三件聖遺物：墓穴深處的「躍石」、魔女守著的「影之披風」，還有鐘樓頂端的「蝙蝠之翼」。', 'To get there you will need three relics: the Leap Stone deep in the catacombs, the Shadow Cloak the witch guards, and the Bat Wing atop the clock tower.'),
    D('oswin', '對了，我也做點小生意。站在我前面按 ↑ 就能看看商品。金幣就是金幣嘛，嘿嘿。', 'Oh, and I run a little shop. Stand before me and press ↑. Gold is gold, after all. Heh heh.'),
  ],
  elise: [
    D('elise', '……哥哥？是你嗎？', '...Brother? Is that you?'),
    D('elise', '不要過來！他要的不只是我……他也在等你！', 'Don’t come! It isn’t only me he wants... he is waiting for you too!'),
    D('lucien', '我不會丟下妳。再等一下，艾莉絲。', 'I am not leaving you. Just a little longer, Elise.'),
  ],
  ending: [
    D('count', '不可能……月亮……竟然選擇了你……', 'Impossible... the moon... chose you...'),
    D('nar', '伯爵化成了灰，黑色的月亮重新亮起銀白色的光。', 'The Count crumbles into ash, and the black moon blazes silver once more.'),
    D('elise', '哥哥！', 'Brother!'),
    D('lucien', '我說過，我會帶妳回家。', 'I told you. I am bringing you home.'),
    D('nar', '兩人走出城門的那一刻，月影城在晨光中崩塌，消失在霧裡。', 'As the two step out through the gate, Moonshadow Castle crumbles in the dawn light and fades into the mist.'),
    D('nar', '……至少，這一百年，它不會再出現了。', '...At least for the next hundred years.'),
  ],
};
