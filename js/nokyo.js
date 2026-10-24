/* ---------------------------------------------------------------------
   農協(js/nokyo.js)
   game.html の「20. ステータス画面 / アイテム屋UI」セクションから、農協(種の
   購入・作物/モンスター素材の販売)に関する部分だけを安全に分離したファイル。
   ロジックは元のまま無変更。畑の耕作・種まき・水やり・収穫そのもの(農地システム/
   栽培システム)は player の状態・アニメーションと密結合しているため、今回は
   分離せず game.html 側に残してある。
   CONFIG / buildings / player / inventory / playerGold / CROPS / getCropDef() /
   MONSTER_DEFS / updateRewardHud() / closeAllModals() / modalBackdrop など、
   game.html本編で定義されるグローバルをそのまま利用するため、このファイルは
   <script src="js/nokyo.js"> を game.html 本編の <script> より後に
   読み込む必要がある(現在の配置のまま変更しないこと)。
--------------------------------------------------------------------- */
// 変更4: 農協の種は「1回の購入で10個」まとめて買う。価格は固定値にせず、
// 各作物の現在の1個価格(c.seedPrice)×この個数で毎回計算する(種の種類・価格設定は変更しない)。
const SEED_PURCHASE_QTY = 10;
const agriModal = document.getElementById('agriModal');
const agriBody = document.getElementById('agriBody');
const agriGoldEl = document.getElementById('agriGold');

function renderAgriModal() {
  agriGoldEl.textContent = `所持ゴールド: ${playerGold} G`;
  let html = '<div class="shopSectionTitle">🌱 種を買う</div>';
  CROPS.forEach(c => {
    const have = inventory.seed[c.id] || 0;
    const packPrice = c.seedPrice * SEED_PURCHASE_QTY;
    html += `<div class="shopItemRow"><div class="itemInfo"><span>${c.icon} ${c.name}の種 ×${SEED_PURCHASE_QTY}</span><small>${packPrice}G ・ 所持${have}</small></div>
      <button class="shopBuyBtn" data-buy-seed="${c.id}" ${playerGold < packPrice ? 'disabled' : ''}>購入</button></div>`;
  });
  html += '<div class="shopSectionTitle">🌾 作物を売る</div>';
  CROPS.forEach(c => {
    const have = inventory.crop[c.id] || 0;
    html += `<div class="shopItemRow"><div class="itemInfo"><span>${c.icon} ${c.name}</span><small>売値${c.sellPrice}G ・ 所持${have}</small></div>
      <button class="shopBuyBtn" data-sell-crop="${c.id}" ${have <= 0 ? 'disabled' : ''}>売る</button></div>`;
  });
  // Phase7(お助けメイド): これまでモンスター素材(牧場で収穫した素材)を売る手段が
  // 無かったため、農協UIに追加する。MONSTER_DEFSのmaterial定義(sellPrice)をそのまま使い、
  // 新しい価格テーブルは作らない。メイドの自動販売処理もこの同じsellPriceを参照する。
  const sellableMaterials = Object.values(MONSTER_DEFS).filter(d => d.material && d.material.sellPrice);
  if (sellableMaterials.length) {
    html += '<div class="shopSectionTitle">🦴 モンスター素材を売る</div>';
    sellableMaterials.forEach(d => {
      const m = d.material;
      const have = inventory[m.key] || 0;
      html += `<div class="shopItemRow"><div class="itemInfo"><span>${m.icon} ${m.name}</span><small>売値${m.sellPrice}G ・ 所持${have}</small></div>
        <button class="shopBuyBtn" data-sell-material="${m.key}" ${have <= 0 ? 'disabled' : ''}>売る</button></div>`;
    });
  }
  agriBody.innerHTML = html;
  agriBody.querySelectorAll('[data-buy-seed]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getCropDef(btn.dataset.buySeed);
      const packPrice = c ? c.seedPrice * SEED_PURCHASE_QTY : 0;
      if (!c || playerGold < packPrice) return; // ゴールド不足: 従来どおり何も買えない
      // インベントリが満杯で種が入りきらないときは、お金を払って種が消えることのないよう購入しない
      if (!Inventory.canAdd('seed:' + c.id, SEED_PURCHASE_QTY)) { showToast('インベントリがいっぱいです', 1800); return; }
      playerGold -= packPrice;
      inventory.seed[c.id] = (inventory.seed[c.id] || 0) + SEED_PURCHASE_QTY;
      updateRewardHud(); renderAgriModal();
    });
  });
  agriBody.querySelectorAll('[data-sell-crop]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getCropDef(btn.dataset.sellCrop);
      if (!c || (inventory.crop[c.id] || 0) <= 0) return;
      inventory.crop[c.id]--;
      playerGold += c.sellPrice;
      updateRewardHud(); renderAgriModal();
    });
  });
  agriBody.querySelectorAll('[data-sell-material]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sellMaterial;
      const def = sellableMaterials.find(d => d.material.key === key);
      if (!def || (inventory[key] || 0) <= 0) return;
      inventory[key]--;
      playerGold += def.material.sellPrice;
      updateRewardHud(); renderAgriModal();
    });
  });
}
function openAgriModal() {
  renderAgriModal();
  modalBackdrop.style.display = 'block';
  agriModal.style.display = 'flex';
}

document.getElementById('agriCloseBtn').addEventListener('click', closeAllModals);
document.getElementById('agriEnterBtn').addEventListener('click', openAgriModal);

/* --- 農協への出入り判定(アイテム屋と同じ仕組み) --- */
const agriPromptEl = document.getElementById('agriPrompt');
const AGRI_POS = { x: buildings[2].x, z: buildings[2].z };
const AGRI_ENTER_RADIUS = 3.5;
CONFIG.agriSafeRadius = 4.5;

function updateAgriProximity() {
  if (!player) return;
  const d = Math.hypot(player.position.x - AGRI_POS.x, player.position.z - AGRI_POS.z);
  agriPromptEl.style.display = d < AGRI_ENTER_RADIUS ? 'flex' : 'none';
}
