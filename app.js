/* AI Recipe Suggestion App - app.js
   Complete front-end logic (local suggestion engine + UI)
*/

/* ---------------------------
   DOM refs
   --------------------------- */
const generateBtn = document.getElementById('generate');
const randomBtn = document.getElementById('random');
const resultsEl = document.getElementById('results');
const ingredientsEl = document.getElementById('ingredients');
const dietEl = document.getElementById('diet');
const cuisineEl = document.getElementById('cuisine');
const mealEl = document.getElementById('meal');
const servingsEl = document.getElementById('servings');
const favoritesEl = document.getElementById('favorites');
const detailEl = document.getElementById('detail');
const querySummary = document.getElementById('querySummary');
const timeEstimate = document.getElementById('timeEstimate');
const apiToggle = document.getElementById('apiToggle');

let favorites = loadFavorites();

/* ---------------------------
   Utilities & storage
   --------------------------- */
function saveFavorites(){
  localStorage.setItem('ai_recipes_fav', JSON.stringify(favorites));
}
function loadFavorites(){
  try {
    return JSON.parse(localStorage.getItem('ai_recipes_fav')||'[]');
  } catch(e){ return [] }
}
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function cleanList(str){
  return str.split(',').map(s=>s.trim()).filter(Boolean).map(s=>s.toLowerCase());
}
function plural(n, word){ return n + ' ' + word + (n>1 ? 's' : '') }

/* ---------------------------
   Templates & categories
   --------------------------- */
const TEMPLATES = [
  {
    id:'pan-saute',
    name:'Pan-Sauté Quick',
    desc:'Sauté main ingredient with aromatics, finish with acid & herbs.',
    tags:['quick','one-pan','stovetop'],
    steps: [
      'Prep: chop ingredients and measure spices.',
      'Heat oil in a pan on medium-high. Sauté aromatics (garlic/onion) until fragrant.',
      'Add main ingredients and cook until done.',
      'Deglaze with lemon/wine/stock, reduce slightly.',
      'Finish with herbs, salt & pepper. Serve hot.'
    ],
    baseTime:15
  },
  {
    id:'sheet-pan',
    name:'Sheet-Pan Roast',
    desc:'Toss vegetables and protein, roast until caramelized.',
    tags:['oven','easy','roast'],
    steps:[
      'Preheat oven to 200°C / 400°F.',
      'Toss ingredients with oil, salt, pepper and herbs on a baking tray.',
      'Roast until nicely browned, toss once midway.',
      'Finish with lemon or a drizzle, serve immediately.'
    ],
    baseTime:30
  },
  {
    id:'stew',
    name:'Comforting One-Pot Stew',
    desc:'Slow-simmer ingredients until tender and flavorful.',
    tags:['stew','one-pot','comfort'],
    steps:[
      'Sauté aromatics and brown protein in the pot.',
      'Add spices, liquids and tougher vegetables.',
      'Simmer gently until everything is tender and flavors meld.',
      'Adjust salt and acidity, serve with bread or rice.'
    ],
    baseTime:50
  },
  {
    id:'salad',
    name:'Fresh Assembly Salad',
    desc:'Combine raw or lightly cooked items with a bright dressing.',
    tags:['no-cook','salad','fresh'],
    steps:[
      'Prepare the dressing and whisk until emulsified.',
      'Chop ingredients into bite-sized pieces.',
      'Toss everything with dressing, taste, and season.',
      'Top with nuts/cheese/herbs for texture.'
    ],
    baseTime:10
  },
  {
    id:'pasta',
    name:'Comfort Pasta',
    desc:'Cook pasta and toss with a quick sauce made from ingredients on hand.',
    tags:['pasta','stovetop'],
    steps:[
      'Boil salted water and cook pasta until al dente.',
      'Reserve some pasta water, drain pasta.',
      'Make sauce in the pan (oil/tomato/cream/cheese) and combine with pasta.',
      'Adjust texture with pasta water and finish with cheese/herbs.'
    ],
    baseTime:20
  }
];

const CATEGORIES = {
  protein: ['chicken','beef','pork','tofu','tempeh','salmon','tuna','shrimp','lentils','beans','egg','eggs'],
  veg: ['onion','garlic','tomato','spinach','kale','carrot','potato','bell pepper','zucchini','eggplant','mushroom','broccoli'],
  grain: ['rice','pasta','quinoa','bread','tortilla','couscous'],
  dairy: ['milk','cheese','yogurt','butter','cream'],
  spice: ['cumin','turmeric','paprika','chili','oregano','basil','rosemary','thyme','ginger']
};

function categorizeIngredient(item){
  item = item.toLowerCase();
  for(const [cat, arr] of Object.entries(CATEGORIES)){
    if(arr.includes(item)) return cat;
  }
  if(item.match(/(chick|beef|pork|tofu|tempeh|salmon|tuna|shrimp|egg|lentil|bean)/)) return 'protein';
  if(item.match(/(rice|pasta|bread|quinoa|tortilla|couscous)/)) return 'grain';
  if(item.match(/(milk|cheese|yogurt|butter|cream)/)) return 'dairy';
  if(item.match(/(onion|garlic|tomato|spinach|carrot|potato|pepper|zucchini|eggplant|mushroom|broccoli)/)) return 'veg';
  return 'misc';
}

/* ---------------------------
   Local generator
   --------------------------- */
function generateRecipesLocal({ingredients, diet, cuisine, meal, servings}, count=6){
  const cats = ingredients.map(i=>({name:i, cat: categorizeIngredient(i)}));
  const hasProtein = cats.some(c=>c.cat==='protein');
  const hasVeg = cats.some(c=>c.cat==='veg');
  const hasGrain = cats.some(c=>c.cat==='grain');

  const weightTemplates = TEMPLATES.map(t=>{
    let score = 0;
    if(t.id==='pasta' && hasGrain) score += 3;
    if(t.id==='pan-saute' && hasProtein && hasVeg) score += 3;
    if(t.id==='sheet-pan' && hasProtein && hasVeg) score += 3;
    if(t.id==='salad' && hasVeg) score += 3;
    if(t.id==='stew' && hasProtein) score += 2;
    if(cuisine && cuisine.toLowerCase() !== 'any'){
      if(cuisine.toLowerCase() === 'italian' && t.id==='pasta') score += 2;
      if(cuisine.toLowerCase() === 'indian' && t.id==='stew') score += 2;
    }
    if(meal && meal.toLowerCase() === 'breakfast' && t.id==='salad') score -= 2;
    return {t,score};
  });

  weightTemplates.sort((a,b)=>b.score - a.score || Math.random()-0.5);

  const matched = [];
  for(let i=0;i<count;i++){
    const choose = weightTemplates[i % weightTemplates.length].t;
    const title = buildTitle(choose, cats, cuisine, meal);
    const ingredientsList = buildIngredientList(choose, cats, servings);
    const steps = adaptSteps(choose, cats);
    const estTime = Math.max(choose.baseTime + Math.round(Math.random()*10 - 4), 8);
    const id = uid('r');
    const score = Math.max(40 + (choose.baseTime - estTime) + Math.round(Math.random()*40), 45);
    matched.push({
      id, title, desc: choose.desc, tags: choose.tags.concat(cuisine && cuisine!=='any' ? [cuisine] : []),
      ingredients: ingredientsList, steps, estTime, score
    });
  }
  return matched;
}

function buildTitle(template, cats, cuisine, meal){
  // pick a main ingredient to highlight
  const main = cats.find(c=>c.cat==='protein') || cats.find(c=>c.cat==='veg') || cats[0];
  const mainText = main ? humanize(main.name) : '';
  const suffix = cuisine && cuisine !== 'any' ? `${cuisine}` : '';
  return `${template.name}${mainText ? ' — ' + capitalize(mainText) : ''}${suffix ? ' ('+suffix+')' : ''}`;
}

function buildIngredientList(template, cats, servings){
  // base items depending on template
  const list = [];
  const s = Math.max(1, parseInt(servings||1,10));
  // include typed ingredients first
  cats.forEach(c => {
    const q = c.cat === 'protein' ? `${s} portion` : (c.cat === 'grain' ? `${s} cup` : 'to taste');
    list.push({name:c.name, amount:q});
  });
  // add some staples suggested by template
  if(template.id === 'pasta'){
    list.push({name:'pasta', amount: `${Math.max(1,s)} cups`});
    list.push({name:'olive oil', amount:'2 tbsp'});
    list.push({name:'salt & pepper', amount:'to taste'});
  } else if(template.id === 'sheet-pan'){
    list.push({name:'olive oil', amount:'2 tbsp'});
    list.push({name:'salt & pepper', amount:'to taste'});
  } else if(template.id === 'salad'){
    list.push({name:'olive oil', amount:'2 tbsp'});
    list.push({name:'lemon or vinegar', amount:'1-2 tbsp'});
  } else if(template.id === 'stew'){
    list.push({name:'stock or water', amount:'2-3 cups'});
    list.push({name:'salt & pepper', amount:'to taste'});
  } else {
    list.push({name:'salt & pepper', amount:'to taste'});
  }
  return list;
}

function adaptSteps(template, cats){
  // Insert ingredient-specific hints into steps
  const main = cats.find(c=>c.cat==='protein') || cats.find(c=>c.cat==='veg') || cats[0];
  const mainName = main ? main.name : null;
  return template.steps.map((s, idx) => {
    let step = s;
    if(idx===1 && mainName){
      step = step + (mainName ? ` Use ${mainName} as the main ingredient.` : '');
    }
    return step;
  });
}

/* ---------------------------
   Rendering
   --------------------------- */
function renderResults(recipes){
  resultsEl.innerHTML = '';
  if(!recipes || recipes.length===0){
    resultsEl.innerHTML = '<div class="muted">No suggestions — try different ingredients.</div>';
    return;
  }
  recipes.forEach(r => {
    const card = document.createElement('div');
    card.className = 'recipe';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:8px">
        <h3>${escapeHtml(r.title)}</h3>
        <div class="tags">
          <div class="tag">${r.estTime} min</div>
        </div>
      </div>
      <p class="muted">${escapeHtml(r.desc)}</p>
      <div class="meta">
        <div class="muted">${r.score}% match</div>
        <div style="display:flex; gap:8px">
          <button class="btn small" data-action="view" data-id="${r.id}">View</button>
          <button class="btn ghost small" data-action="save" data-id="${r.id}">Save</button>
        </div>
      </div>
    `;
    // attach full object for detail lookup
    card._recipe = r;
    resultsEl.appendChild(card);

    // button handlers
    card.querySelector('[data-action="view"]').addEventListener('click', ()=> showDetail(r));
    card.querySelector('[data-action="save"]').addEventListener('click', ()=>{
      saveFavorite(r);
    });
  });
}

function renderFavorites(){
  favoritesEl.innerHTML = '';
  if(favorites.length===0){
    favoritesEl.innerHTML = '<div class="muted">No saved recipes yet — save a suggestion to keep it here.</div>';
    return;
  }
  favorites.forEach(f => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.innerHTML = `<div style="flex:1"><strong>${escapeHtml(f.title)}</strong><div class="muted" style="font-size:12px">${f.estTime} min • ${f.tags ? f.tags.slice(0,2).join(', ') : ''}</div></div>
                    <div style="display:flex; gap:6px">
                      <button class="btn small" data-action="view" data-id="${f.id}">View</button>
                      <button class="btn ghost small" data-action="remove" data-id="${f.id}">Remove</button>
                    </div>`;
    el.querySelector('[data-action="view"]').addEventListener('click', ()=> showDetail(f));
    el.querySelector('[data-action="remove"]').addEventListener('click', ()=>{
      favorites = favorites.filter(x=>x.id !== f.id);
      saveFavorites();
      renderFavorites();
    });
    favoritesEl.appendChild(el);
  });
}

/* ---------------------------
   Detail view & favorites
   --------------------------- */
function showDetail(r){
  detailEl.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <h3 style="margin:0">${escapeHtml(r.title)}</h3>
    <div class="muted" style="font-size:13px; margin-bottom:8px">${r.estTime} min • ${r.tags ? r.tags.join(', ') : ''}</div>
    <div style="margin-bottom:8px"><strong>Ingredients</strong>
      <ul>${r.ingredients.map(i=>`<li>${escapeHtml(i.amount ? i.amount + ' ' : '')}${escapeHtml(i.name)}</li>`).join('')}</ul>
    </div>
    <div><strong>Steps</strong>
      <ol>${r.steps.map(s=>`<li class="muted" style="margin-bottom:6px">${escapeHtml(s)}</li>`).join('')}</ol>
    </div>
  `;
  detailEl.appendChild(wrapper);
}

function saveFavorite(recipe){
  // avoid duplicates (based on title)
  if(favorites.some(f=>f.title === recipe.title)) {
    alert('Already saved to favorites.');
    return;
  }
  favorites.unshift(recipe);
  if(favorites.length>30) favorites.pop(); // limit
  saveFavorites();
  renderFavorites();
  alert('Saved to favorites ❤️');
}

/* ---------------------------
   Helpers
   --------------------------- */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); }); }
function humanize(s){ return s ? s.replace(/-/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) : s; }
function capitalize(s){ if(!s) return s; return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------------------------
   Event wiring
   --------------------------- */
generateBtn.addEventListener('click', ()=>{
  const raw = ingredientsEl.value || '';
  const ingredients = cleanList(raw);
  const diet = dietEl.value;
  const cuisine = cuisineEl.value;
  const meal = mealEl.value;
  const servings = servingsEl.value || 2;

  querySummary.textContent = ingredients.length ? ingredients.join(', ') : 'No ingredients';
  timeEstimate.textContent = '15–30';

  // Local generation (you can replace this with an OpenAI call)
  const recipes = generateRecipesLocal({ingredients, diet, cuisine, meal, servings}, 6);
  renderResults(recipes);
});

randomBtn.addEventListener('click', ()=>{
  // surprise: fill input with random pantry items and generate
  const pantry = ['chicken','garlic','lemon','spinach','pasta','tomato','onion','potato','tofu','bell pepper','rice','mushroom','shrimp'];
  const pick = [];
  for(let i=0;i<3;i++) pick.push(pantry[Math.floor(Math.random()*pantry.length)]);
  ingredientsEl.value = [...new Set(pick)].join(', ');
  generateBtn.click();
});

/* OpenAI example toggle (shows a quick alert with snippet) */
apiToggle.addEventListener('click', ()=>{
  const snippet = `// Example OpenAI fetch (commented). Add your server-side key!
/*
fetch('/your-server/openai-recipe', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ingredients: ['chicken','garlic'], diet:'any', cuisine:'any', meal:'dinner'})
})
.then(r => r.json()).then(data => { console.log(data); });
*/
`;
  alert('OpenAI example (client-side snippet shown in console). See console for snippet.');
  console.log(snippet);
});

/* initial render */
renderFavorites();

/* ---------------------------
   OPTIONAL: Example OpenAI call (commented)
   NOTE: Do NOT put your OpenAI secret in client-side code. Use a server.
   ---------------------------
   Example server endpoint expectation:
   POST /openai-recipe { ingredients: [...], diet, cuisine, meal }
   Response: { recipes: [{ title, desc, tags, ingredients:[{name,amount}], steps:[], estTime, score }] }
*/

/*
async function fetchFromOpenAI(payload) {
  // Example: send to your server which calls OpenAI with your API key
  const res = await fetch('/openai-recipe', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('OpenAI server error');
  const data = await res.json();
  return data.recipes;
}
*/

/* End of app.js */