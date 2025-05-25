console.log('🚀 RunRPG JavaScript loaded...');

// Global variables
let userBaseline = {};
let selections = {};
let allLootCollected = [];
let currentLoot = [];
let chestOpened = false;

// Load saved data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
});

// Load saved data from localStorage
function loadSavedData() {
    try {
        const savedBaseline = localStorage.getItem('runrpg_baseline');
        const savedLoot = localStorage.getItem('runrpg_loot');
        
        if (savedBaseline) {
            userBaseline = JSON.parse(savedBaseline);
            console.log('✅ Loaded baseline:', userBaseline);
            
            // Skip setup if baseline exists
            document.getElementById('setupScreen').classList.add('hidden');
            document.getElementById('lootSystem').classList.remove('hidden');
            
            // Pre-fill form with baseline data
            document.getElementById('distance').value = userBaseline.distance;
            document.getElementById('time').value = (userBaseline.distance * userBaseline.pace).toFixed(1);
            document.getElementById('elevation').value = userBaseline.elevation;
        }
        
        if (savedLoot) {
            allLootCollected = JSON.parse(savedLoot);
            console.log('✅ Loaded loot:', allLootCollected.length, 'items');
        }
        
        updateInventoryCount();
    } catch (error) {
        console.log('localStorage not available or error loading data:', error);
    }
}

// Gear types and loot definitions
const gearTypes = {
    weapon: { 
        icon: '⚔️', 
        names: ['Chipped Dagger', 'Steel Longsword', 'Flamberge of Power', 'Blade of Legends', 'Godslayer'] 
    },
    helmet: { 
        icon: '⛑️', 
        names: ['Cracked Skull Cap', 'Iron Coif', 'Crown of Storms', 'Helm of the Eternal', 'Diadem of Gods'] 
    },
    chest: { 
        icon: '🛡️', 
        names: ['Torn Leather', 'Studded Vest', 'Mithril Chainmail', 'Armor of the Void', 'Celestial Plate'] 
    },
    gloves: { 
        icon: '🧤', 
        names: ['Ragged Gloves', 'Leather Gauntlets', 'Enchanted Handguards', 'Gloves of the Divine', 'Fists of Creation'] 
    },
    boots: { 
        icon: '🥾', 
        names: ['Worn Sandals', 'Iron-Shod Boots', 'Boots of Swiftness', 'Treads of the Immortal', 'Steps of Eternity'] 
    }
};

const rarities = ['common', 'uncommon', 'rare', 'legendary', 'mythic'];
const rarityColors = {
    common: '#9CA3AF',
    uncommon: '#10B981',
    rare: '#3B82F6',
    legendary: '#F59E0B',
    mythic: '#EF4444'
};

// Setup screen functions
function selectOption(clickedElement, category, value) {
    // Remove selected class from all options in this category
    const categoryOptions = document.querySelectorAll(`[data-category="${category}"]`);
    categoryOptions.forEach(option => option.classList.remove('selected'));
    
    // Add selected class to clicked element
    clickedElement.classList.add('selected');
    selections[category] = value;

    // Check if all categories are selected
    const requiredCategories = ['frequency', 'distance', 'pace', 'terrain'];
    const allAnswered = requiredCategories.every(cat => selections[cat]);
    document.getElementById('continueBtn').disabled = !allAnswered;
}

function completeSetup() {
    userBaseline = calculateBaseline(selections);
    
    // Save baseline to localStorage
    try {
        localStorage.setItem('runrpg_baseline', JSON.stringify(userBaseline));
        console.log('✅ Baseline saved');
    } catch (error) {
        console.log('Could not save baseline:', error);
    }
    
    // Pre-fill the form with baseline values
    document.getElementById('distance').value = userBaseline.distance;
    document.getElementById('time').value = (userBaseline.distance * userBaseline.pace).toFixed(1);
    document.getElementById('elevation').value = userBaseline.elevation;
    
    // Switch screens
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('lootSystem').classList.remove('hidden');
    
    updateInventoryCount();
}

function calculateBaseline(selections) {
    const distanceMap = { 
        'short': 1.5, 
        'medium': 3.5, 
        'long': 5.5, 
        'ultra': 8.0 
    };
    const paceMap = { 
        'fast': 7.0, 
        'moderate': 9.0, 
        'comfortable': 11.0, 
        'easy': 13.0 
    };
    const elevationMap = { 
        'flat': 25, 
        'rolling': 150, 
        'hilly': 400 
    };

    return {
        distance: distanceMap[selections.distance],
        pace: paceMap[selections.pace],
        elevation: elevationMap[selections.terrain],
        frequency: selections.frequency
    };
}

// Performance calculation functions
function calculatePace(distance, timeMinutes) {
    if (!distance || !timeMinutes || distance <= 0) return 0;
    return timeMinutes / distance;
}

function calculatePerformanceScore(distance, time, elevation) {
    let score = 65; // Base score (baseline performance)
    
    // Distance factor (more weight)
    const distanceRatio = distance / userBaseline.distance;
    score += (distanceRatio - 1) * 30; // Increased from 25
    
    // Pace factor (better pace = higher score)
    const actualPace = calculatePace(distance, time);
    const paceRatio = userBaseline.pace / actualPace; // Inverted so faster = higher
    score += (paceRatio - 1) * 30; // Increased from 25
    
    // Elevation factor (less weight)
    const elevationRatio = elevation / userBaseline.elevation;
    score += (elevationRatio - 1) * 10; // Decreased from 15
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, score));
}

function calculateLootChances(performanceScore) {
    // Base weights for loot distribution
    const baseWeights = { 
        common: 60,
        uncommon: 25,
        rare: 10,
        legendary: 4,
        mythic: 1
    };
    
    // Performance multiplier: -1 (terrible) to +1 (amazing)
    // 65 is baseline, so we center around that
    const performanceMultiplier = (performanceScore - 65) / 35;
    
    // Calculate modified weights based on performance
    // For baseline performance (65), multiplier is 0, so no changes
    const modifiedWeights = {
        common: Math.max(10, baseWeights.common - (performanceMultiplier * 30)), // Common goes DOWN as performance improves
        uncommon: Math.max(5, baseWeights.uncommon + (performanceMultiplier * 15)),
        rare: Math.max(1, baseWeights.rare + (performanceMultiplier * 10)),
        legendary: Math.max(0.5, baseWeights.legendary + (performanceMultiplier * 4)),
        mythic: Math.max(0.1, baseWeights.mythic + (performanceMultiplier * 2))
    };
    
    // Calculate total weight for percentage calculation
    const totalBase = Object.values(baseWeights).reduce((a, b) => a + b, 0);
    const totalModified = Object.values(modifiedWeights).reduce((a, b) => a + b, 0);
    
    // Convert weights to percentages
    const chances = {};
    const changes = {};
    
    for (const rarity in baseWeights) {
        const basePercent = (baseWeights[rarity] / totalBase) * 100;
        const modifiedPercent = (modifiedWeights[rarity] / totalModified) * 100;
        chances[rarity] = modifiedPercent;
        changes[rarity] = modifiedPercent - basePercent;
    }
    
    return { 
        weights: modifiedWeights,
        chances: chances, 
        changes: changes, 
        base: baseWeights 
    };
}


function selectRarityByWeight(weights) {
    // Calculate total weight
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;
    
    // Go through each rarity and subtract its weight from random
    // When random becomes <= 0, we've found our rarity
    for (const [rarity, weight] of Object.entries(weights)) {
        random -= weight;
        if (random <= 0) {
            return rarity;
        }
    }
    
    // Fallback (should never happen)
    return 'common';
}

function selectRarityByChance(chances) {
    const roll = Math.random() * 100;
    if (roll < chances.mythic) return 'mythic';
    if (roll < chances.legendary) return 'legendary';
    if (roll < chances.rare) return 'rare';
    if (roll < chances.uncommon) return 'uncommon';
    return 'common';
}

// Loot generation functions
function generateRandomLoot(performanceScore) {
    const numItems = Math.floor(Math.random() * 3) + 3; // 3-5 items
    const loot = [];
    const lootChances = calculateLootChances(performanceScore);
    
    for (let i = 0; i < numItems; i++) {
        const gearTypeKeys = Object.keys(gearTypes);
        const randomGearType = gearTypeKeys[Math.floor(Math.random() * gearTypeKeys.length)];
        const gear = gearTypes[randomGearType];
        
        // Use the new weight-based selection
        const rarity = selectRarityByWeight(lootChances.weights);
        const rarityIndex = rarities.indexOf(rarity);
        const itemName = gear.names[Math.min(rarityIndex, gear.names.length - 1)];
        
        // Get fixed stats for this specific item
        const stats = generateItemStats(randomGearType, itemName);
        
        loot.push({
            type: randomGearType,
            name: itemName,
            rarity: rarity,
            icon: gear.icon,
            stats: stats,
            timestamp: Date.now() + i
        });
    }
    
    return loot;
}

// Define fixed stats for each item
const itemStatDatabase = {
    weapon: {
        'Chipped Dagger': { strength: 2, defense: 0, dexterity: 1, vitality: 0 },
        'Steel Longsword': { strength: 5, defense: 0, dexterity: 2, vitality: 0 },
        'Flamberge of Power': { strength: 8, defense: 0, dexterity: 3, vitality: 0 },
        'Blade of Legends': { strength: 12, defense: 0, dexterity: 5, vitality: 0 },
        'Godslayer': { strength: 18, defense: 0, dexterity: 8, vitality: 0 }
    },
    helmet: {
        'Cracked Skull Cap': { strength: 0, defense: 2, dexterity: 0, vitality: 1 },
        'Iron Coif': { strength: 0, defense: 4, dexterity: 0, vitality: 3 },
        'Crown of Storms': { strength: 0, defense: 7, dexterity: 0, vitality: 5 },
        'Helm of the Eternal': { strength: 0, defense: 10, dexterity: 0, vitality: 8 },
        'Diadem of Gods': { strength: 0, defense: 15, dexterity: 0, vitality: 12 }
    },
    chest: {
        'Torn Leather': { strength: 0, defense: 3, dexterity: 0, vitality: 2 },
        'Studded Vest': { strength: 0, defense: 6, dexterity: 0, vitality: 4 },
        'Mithril Chainmail': { strength: 0, defense: 9, dexterity: 0, vitality: 7 },
        'Armor of the Void': { strength: 0, defense: 13, dexterity: 0, vitality: 10 },
        'Celestial Plate': { strength: 0, defense: 20, dexterity: 0, vitality: 15 }
    },
    gloves: {
        'Ragged Gloves': { strength: 1, defense: 0, dexterity: 2, vitality: 0 },
        'Leather Gauntlets': { strength: 2, defense: 0, dexterity: 4, vitality: 0 },
        'Enchanted Handguards': { strength: 4, defense: 0, dexterity: 6, vitality: 0 },
        'Gloves of the Divine': { strength: 6, defense: 0, dexterity: 9, vitality: 0 },
        'Fists of Creation': { strength: 9, defense: 0, dexterity: 14, vitality: 0 }
    },
    boots: {
        'Worn Sandals': { strength: 0, defense: 1, dexterity: 3, vitality: 0 },
        'Iron-Shod Boots': { strength: 0, defense: 2, dexterity: 5, vitality: 0 },
        'Boots of Swiftness': { strength: 0, defense: 3, dexterity: 8, vitality: 0 },
        'Treads of the Immortal': { strength: 0, defense: 5, dexterity: 12, vitality: 0 },
        'Steps of Eternity': { strength: 0, defense: 8, dexterity: 18, vitality: 0 }
    }
};

function generateItemStats(itemType, itemName) {
    // Get the fixed stats for this specific item
    return itemStatDatabase[itemType][itemName] || { strength: 0, defense: 0, dexterity: 0, vitality: 0 };
}

// Main loot generation function
function generateLoot() {
    const distance = parseFloat(document.getElementById('distance').value) || 0;
    const time = parseFloat(document.getElementById('time').value) || 0;
    const elevation = parseInt(document.getElementById('elevation').value) || 0;
    
    if (distance <= 0 || time <= 0) {
        alert('Please enter valid distance and time values!');
        return;
    }
    
    const pace = calculatePace(distance, time);
    const performanceScore = calculatePerformanceScore(distance, time, elevation);
    const lootChances = calculateLootChances(performanceScore);
    
    // Generate the summary
    displayRunSummary(distance, time, pace, elevation, performanceScore, lootChances);
    
    // Generate loot
    currentLoot = generateRandomLoot(performanceScore);
    
    // Reset chest state
    chestOpened = false;
    const chest = document.getElementById('chest');
    chest.classList.remove('opened', 'opening');
    
    // Show results section
    document.getElementById('results').style.display = 'block';
    document.getElementById('lootItems').innerHTML = '';
    
    // Scroll to results
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function displayRunSummary(distance, time, pace, elevation, performanceScore, lootChances) {
    const roundedChanges = {
        common: Math.round(lootChances.changes.common),
        uncommon: Math.round(lootChances.changes.uncommon),
        rare: Math.round(lootChances.changes.rare),
        legendary: Math.round(lootChances.changes.legendary),
        mythic: Math.round(lootChances.changes.mythic)
    };
    
    // Fix the performance text logic based on score
    let performanceColor = '#e0e0e0';
    let performanceText = 'Baseline Performance';
    
    if (performanceScore >= 85) {
        performanceColor = '#EF4444'; // Mythic red
        performanceText = 'Legendary Performance!';
    } else if (performanceScore >= 75) {
        performanceColor = '#F59E0B'; // Legendary orange
        performanceText = 'Excellent Performance!';
    } else if (performanceScore >= 65) {
        performanceColor = '#10B981'; // Green
        performanceText = 'Good Performance';
    } else if (performanceScore >= 55) {
        performanceColor = '#e0e0e0'; // Neutral
        performanceText = 'Baseline Performance';
    } else if (performanceScore >= 45) {
        performanceColor = '#9CA3AF'; // Gray
        performanceText = 'Below Average';
    } else {
        performanceColor = '#EF4444'; // Red
        performanceText = 'Poor Performance';
    }

    // Helper function to get change class
    const getChangeClass = (change) => {
        if (change > 0) return 'change-positive';
        if (change < 0) return 'change-negative';
        return 'change-neutral';
    };

    const summaryHtml = `
        <h3>Run Summary</h3>
        <div class="summary-grid">
            <div class="stat-box run-data-box">
                <div class="stat-value run-data-values">
                    <div>
                        <span>${distance}</span><br>
                        <small>MILES</small>
                    </div>
                    <div>
                        <span>${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')}</span><br>
                        <small>PACE/MI</small>
                    </div>
                    <div>
                        <span>${elevation}</span><br>
                        <small>ELEVATION</small>
                    </div>
                </div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="color: ${performanceColor};">${Math.round(performanceScore)}</div>
                <div class="stat-label">${performanceText}</div>
            </div>
        </div>
        
        <h3 style="margin-top: 20px;">Loot Drop Chances</h3>
        <div class="summary-grid">
            <div class="stat-box" style="grid-column: 1 / -1;">
                <div class="stat-value loot-chances-grid">
                    ${rarities.map(rarity => {
                        const basePercent = Math.round((lootChances.base[rarity] / Object.values(lootChances.base).reduce((a,b) => a+b, 0)) * 100);
                        return `
                        <div class="loot-chance-item">
                            <div class="loot-chance-percent rarity-color-${rarity}">${Math.round(lootChances.chances[rarity])}%</div>
                            <div class="rarity-color-${rarity}" style="font-size: 12px; text-transform: uppercase; margin-bottom: 2px;">${rarity}</div>
                            <div style="font-size: 11px; opacity: 0.6; margin-bottom: 2px;">Base: ${basePercent}%</div>
                            <small class="loot-chance-change ${getChangeClass(roundedChanges[rarity])}">(${roundedChanges[rarity] >= 0 ? '+' : ''}${roundedChanges[rarity]}%)</small>
                        </div>
                    `}).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('summary').innerHTML = summaryHtml;
}

// Chest interaction
function openChest() {
    if (chestOpened) return;
    
    const chest = document.getElementById('chest');
    chest.classList.add('opening');
    
    setTimeout(() => {
        chest.classList.remove('opening');
        chest.classList.add('opened');
        chestOpened = true;
        
        displayLoot();
        saveBatchLoot();
    }, 500);
}

function displayLoot() {
    const lootContainer = document.getElementById('lootItems');
    lootContainer.innerHTML = '';
    
    currentLoot.forEach((item, index) => {
        const lootElement = document.createElement('div');
        lootElement.className = `loot-item ${item.rarity}`;
        lootElement.style.animationDelay = `${index * 0.1}s`;
        
        // Build stats display based on which stats the item has
        let statsDisplay = [];
        if (item.stats.strength > 0) statsDisplay.push(`⚔️ STR: ${item.stats.strength}`);
        if (item.stats.defense > 0) statsDisplay.push(`🛡️ DEF: ${item.stats.defense}`);
        if (item.stats.dexterity > 0) statsDisplay.push(`🏃 DEX: ${item.stats.dexterity}`);
        if (item.stats.vitality > 0) statsDisplay.push(`❤️ VIT: ${item.stats.vitality}`);
        
        lootElement.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name rarity-color-${item.rarity}">${item.name}</div>
            <div class="item-rarity rarity-color-${item.rarity}">${item.rarity}</div>
            <div class="item-stats">
                ${statsDisplay.map(stat => `<div>${stat}</div>`).join('')}
            </div>
        `;
        
        lootContainer.appendChild(lootElement);
    });
}

// Inventory management
function saveBatchLoot() {
    allLootCollected.push(...currentLoot);
    
    try {
        localStorage.setItem('runrpg_loot', JSON.stringify(allLootCollected));
        console.log('✅ Loot saved to inventory');
    } catch (error) {
        console.log('Could not save loot:', error);
    }
    
    updateInventoryCount();
}

let currentSort = 'newest';

function sortInventory(sortType) {
    currentSort = sortType;
    updateCharacterInventory();
}

function updateInventoryCount() {
    const count = allLootCollected.length;
    const countElement = document.getElementById('inventoryCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Reset data function (for testing/reset)
// Reset data function (for testing/reset)
function resetAllData() {
    if (confirm('Are you sure you want to reset all data? This will clear your baseline settings and delete all collected loot.')) {
        try {
            // Clear localStorage
            localStorage.removeItem('runrpg_baseline');
            localStorage.removeItem('runrpg_loot');
            localStorage.removeItem('runrpg_equipped');
            
            // Reset global variables
            userBaseline = {};
            allLootCollected = [];
            currentLoot = [];
            selections = {};
            equippedGear = {
                helmet: null,
                weapon: null,
                chest: null,
                gloves: null,
                boots: null
            };
            
            // Force update all equipment slots to show empty
            const slots = ['helmet', 'weapon', 'chest', 'gloves', 'boots'];
            slots.forEach(slot => {
                const slotElement = document.getElementById(`slot-${slot}`);
                if (slotElement) {
                    slotElement.innerHTML = '<span class="empty-slot">Empty</span>';
                }
            });
            
            // Reset character stats to base values
            const statElements = ['totalStrength', 'totalDefense', 'totalDexterity', 'totalVitality'];
            const baseValues = [10, 8, 8, 10]; // Base stats
            statElements.forEach((stat, index) => {
                const element = document.getElementById(stat);
                if (element) {
                    element.textContent = baseValues[index];
                }
            });
            
            // Show setup screen again
            document.getElementById('setupScreen').classList.remove('hidden');
            document.getElementById('lootSystem').classList.add('hidden');
            document.getElementById('characterScreen').classList.add('hidden');
            document.getElementById('combatScreen').classList.add('hidden');
            
            // Clear any selected options
            document.querySelectorAll('.option.selected').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Disable continue button
            document.getElementById('continueBtn').disabled = true;
            
            // Clear form inputs
            document.getElementById('distance').value = '';
            document.getElementById('time').value = '';
            document.getElementById('elevation').value = '';
            
            // Hide results
            document.getElementById('results').style.display = 'none';
            
            // Update inventory count
            updateInventoryCount();
            
            console.log('✅ All data reset successfully');
            
        } catch (error) {
            console.log('Could not clear data:', error);
            alert('Error clearing data. You may need to clear your browser cache manually.');
        }
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close any open modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.remove());
    }
    
    if (e.key === 'i' && e.ctrlKey) {
        e.preventDefault();
        showInventory();
    }
});

// Character system variables
let equippedGear = {
    helmet: null,
    weapon: null,
    chest: null,
    gloves: null,
    boots: null
};

// Load equipped gear
function loadEquippedGear() {
    try {
        const saved = localStorage.getItem('runrpg_equipped');
        if (saved) {
            equippedGear = JSON.parse(saved);
        }
    } catch (error) {
        console.log('Could not load equipped gear:', error);
    }
}

// Save equipped gear
function saveEquippedGear() {
    try {
        localStorage.setItem('runrpg_equipped', JSON.stringify(equippedGear));
    } catch (error) {
        console.log('Could not save equipped gear:', error);
    }
}

// Show character screen
function showCharacterScreen() {
    document.getElementById('lootSystem').classList.add('hidden');
    document.getElementById('characterScreen').classList.remove('hidden');
    loadEquippedGear();
    updateCharacterStats();
    updateEquipmentSlots();
    updateCharacterInventory();
}

// Show loot system (back button)
function showLootSystem() {
    document.getElementById('characterScreen').classList.add('hidden');
    document.getElementById('lootSystem').classList.remove('hidden');
}

// Calculate character stats from equipped gear
function updateCharacterStats() {
    let totalStrength = 0;
    let totalDefense = 0;
    let totalDexterity = 0;
    let totalVitality = 0;
    
    // Base stats
    totalStrength += 10;
    totalDefense += 8;
    totalDexterity += 8;
    totalVitality += 10;
    
    // Add stats from equipped items
    Object.values(equippedGear).forEach(item => {
        if (item) {
            totalStrength += item.stats.strength || 0;
            totalDefense += item.stats.defense || 0;
            totalDexterity += item.stats.dexterity || 0;
            totalVitality += item.stats.vitality || 0;
        }
    });
    
    document.getElementById('totalStrength').textContent = totalStrength;
    document.getElementById('totalDefense').textContent = totalDefense;
    document.getElementById('totalDexterity').textContent = totalDexterity;
    document.getElementById('totalVitality').textContent = totalVitality;
}

// Update equipment slot displays
function updateEquipmentSlots() {
    const slots = ['helmet', 'weapon', 'chest', 'gloves', 'boots'];
    slots.forEach(slot => {
        const slotElement = document.getElementById(`slot-${slot}`);
        const item = equippedGear[slot];
        if (item) {
            // Build stats display
            let statsDisplay = [];
            if (item.stats.strength > 0) statsDisplay.push(`⚔️${item.stats.strength}`);
            if (item.stats.defense > 0) statsDisplay.push(`🛡️${item.stats.defense}`);
            if (item.stats.dexterity > 0) statsDisplay.push(`🏃${item.stats.dexterity}`);
            if (item.stats.vitality > 0) statsDisplay.push(`❤️${item.stats.vitality}`);
            
            // Make entire item clickable to unequip
            slotElement.innerHTML = `
                <div class="equipped-item ${item.rarity}" onclick="unequipItem('${slot}')">
                    <div class="item-icon">${item.icon}</div>
                    <div class="item-name rarity-color-${item.rarity}">${item.name}</div>
                    <div class="item-stats">${statsDisplay.join(' ')}</div>
                </div>
            `;
        } else {
            slotElement.innerHTML = '<span class="empty-slot">Empty</span>';
        }
    });
}

// Filter inventory
let currentFilter = 'all';
function filterInventory(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    updateCharacterInventory();
}

// Get item category for filtering
function getItemCategory(type) {
    if (['weapon'].includes(type)) return 'weapon';
    if (['helmet', 'chest', 'gloves', 'boots'].includes(type)) return 'armor';
    return 'other';
}

// Update inventory display to show equipped items can be clicked
function updateCharacterInventory() {
    const inventoryDiv = document.getElementById('characterInventory');
    
    // Filter items based on current filter
    let itemsToShow = [...allLootCollected];
    if (currentFilter !== 'all') {
        itemsToShow = itemsToShow.filter(item => 
            getItemCategory(item.type) === currentFilter
        );
    }
    
    // Sort items
    switch(currentSort) {
        case 'newest':
            itemsToShow.sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'rarity':
            const rarityOrder = { mythic: 0, legendary: 1, rare: 2, uncommon: 3, common: 4 };
            itemsToShow.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
            break;
        case 'type':
            itemsToShow.sort((a, b) => a.type.localeCompare(b.type));
            break;
    }
    
    // Update inventory count badge
    const badge = document.getElementById('inventoryCountBadge');
    if (badge) {
        badge.textContent = allLootCollected.length;
    }
    
    // Check if item is equipped
    const isItemEquipped = (item) => {
        return Object.values(equippedGear).some(equipped => 
            equipped && equipped.timestamp === item.timestamp
        );
    };
    
    inventoryDiv.innerHTML = itemsToShow.map(item => {
        const equipped = isItemEquipped(item);
        
        // Build compact stats display
        let statsDisplay = [];
        if (item.stats.strength > 0) statsDisplay.push(`⚔️${item.stats.strength}`);
        if (item.stats.defense > 0) statsDisplay.push(`🛡️${item.stats.defense}`);
        if (item.stats.dexterity > 0) statsDisplay.push(`🏃${item.stats.dexterity}`);
        if (item.stats.vitality > 0) statsDisplay.push(`❤️${item.stats.vitality}`);
        
        return `
            <div class="inventory-item-card ${item.rarity} ${equipped ? 'equipped' : ''}" 
                 onclick="equipItem(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                <div class="item-icon">${item.icon}</div>
                <div class="item-name rarity-color-${item.rarity}">${item.name}</div>
                <div class="item-stats">
                    ${statsDisplay.join(' ')}
                </div>
                ${equipped ? '<div class="item-equipped-label">EQUIPPED</div>' : ''}
            </div>
        `;
    }).join('');
}

// Equip item
function equipItem(item) {
    // Check if this item is already equipped
    const isEquipped = Object.values(equippedGear).some(equipped => 
        equipped && equipped.timestamp === item.timestamp
    );
    
    if (isEquipped) {
        // Find which slot has this item and unequip it
        for (const [slot, equipped] of Object.entries(equippedGear)) {
            if (equipped && equipped.timestamp === item.timestamp) {
                unequipItem(slot);
                return;
            }
        }
    } else {
        // Equip the item in its slot
        equippedGear[item.type] = item;
        
        // Save and update displays
        saveEquippedGear();
        updateCharacterStats();
        updateEquipmentSlots();
        updateCharacterInventory();
    }
}

// Unequip item
function unequipItem(slot) {
    equippedGear[slot] = null;
    saveEquippedGear();
    updateCharacterStats();
    updateEquipmentSlots();
    updateCharacterInventory();
}

// Combat System Variables
let combatInProgress = false;
let playerCombatStats = null;
let bossCombatStats = null;
let combatLog = [];
let turnCount = 0;

// Boss definitions based on dungeon type
const bosses = {
    quick: {
        name: "Shadow Imp",
        sprite: "👺",
        stats: { strength: 15, defense: 10, dexterity: 10, vitality: 15 }
    },
    journey: {
        name: "Corrupted Knight",
        sprite: "🗿",
        stats: { strength: 20, defense: 15, dexterity: 15, vitality: 20 }
    },
    epic: {
        name: "Ancient Dragon",
        sprite: "🐲",
        stats: { strength: 30, defense: 25, dexterity: 20, vitality: 30 }
    }
};

// Calculate player stats from equipped gear (limited to 5 slots for now)
function calculateCombatStats() {
    const stats = {
        strength: 10,  // Base stats
        defense: 8,
        dexterity: 8,
        vitality: 10
    };
    
    let debugInfo = "Base Stats: STR:10, DEF:8, DEX:8, VIT:10\n";
    
    // Add stats from equipped items directly
    Object.entries(equippedGear).forEach(([slot, item]) => {
        if (item) {
            stats.strength += item.stats.strength || 0;
            stats.defense += item.stats.defense || 0;
            stats.dexterity += item.stats.dexterity || 0;
            stats.vitality += item.stats.vitality || 0;
            
            debugInfo += `${item.name} (${slot}): +${item.stats.strength || 0} STR, +${item.stats.defense || 0} DEF, +${item.stats.dexterity || 0} DEX, +${item.stats.vitality || 0} VIT\n`;
        }
    });
    
    // Update debug display
    const debugElement = document.getElementById('playerGearDebug');
    if (debugElement) {
        debugElement.innerHTML = `<pre>${debugInfo}</pre>`;
    }
    
    return stats;
}

// Show combat screen
function showCombatScreen(dungeonType = 'quick') {
    document.getElementById('characterScreen').classList.add('hidden');
    document.getElementById('lootSystem').classList.add('hidden');
    document.getElementById('combatScreen').classList.remove('hidden');
    
    // Setup player stats
    playerCombatStats = calculateCombatStats();
    playerCombatStats.currentHP = playerCombatStats.vitality * 10;
    playerCombatStats.maxHP = playerCombatStats.currentHP;
    
    // Setup boss stats
    const boss = bosses[dungeonType];
    bossCombatStats = { ...boss.stats };
    bossCombatStats.name = boss.name;
    bossCombatStats.sprite = boss.sprite;
    bossCombatStats.currentHP = bossCombatStats.vitality * 10;
    bossCombatStats.maxHP = bossCombatStats.currentHP;
    
    // Calculate and display win probability
    const winChance = calculateWinProbability(playerCombatStats, bossCombatStats);
    const debugElement = document.getElementById('combatCalcDebug');
    if (debugElement) {
        debugElement.innerHTML = `<pre>Win Probability: ${winChance}%\n\nPlayer Total Power: ${playerCombatStats.strength + playerCombatStats.defense + playerCombatStats.dexterity + playerCombatStats.vitality}\nBoss Total Power: ${bossCombatStats.strength + bossCombatStats.defense + bossCombatStats.dexterity + bossCombatStats.vitality}</pre>`;
    }
    
    // Update UI
    updateCombatUI();
    document.getElementById('bossName').textContent = boss.name;
    document.querySelector('.boss-side .combatant-sprite').textContent = boss.sprite;
    
    // Clear combat log
    combatLog = [];
    document.getElementById('combatLog').innerHTML = '';
    
    // Reset buttons
    document.getElementById('startCombatBtn').disabled = false;
}

// Update combat UI
function updateCombatUI() {
    // Player stats
    document.getElementById('playerStr').textContent = playerCombatStats.strength;
    document.getElementById('playerDef').textContent = playerCombatStats.defense;
    document.getElementById('playerDex').textContent = playerCombatStats.dexterity;
    document.getElementById('playerVit').textContent = playerCombatStats.vitality;
    
    const playerHP = Math.max(0, playerCombatStats.currentHP);
    document.getElementById('playerHealthText').textContent = `${playerHP}/${playerCombatStats.maxHP}`;
    const playerHealthPercent = playerHP > 0 ? (playerHP / playerCombatStats.maxHP) * 100 : 0;
    document.getElementById('playerHealthBar').style.width = `${playerHealthPercent}%`;
    
    // Boss stats
    document.getElementById('bossStr').textContent = bossCombatStats.strength;
    document.getElementById('bossDef').textContent = bossCombatStats.defense;
    document.getElementById('bossDex').textContent = bossCombatStats.dexterity;
    document.getElementById('bossVit').textContent = bossCombatStats.vitality;
    
    const bossHP = Math.max(0, bossCombatStats.currentHP);
    document.getElementById('bossHealthText').textContent = `${bossHP}/${bossCombatStats.maxHP}`;
    const bossHealthPercent = bossHP > 0 ? (bossHP / bossCombatStats.maxHP) * 100 : 0;
    document.getElementById('bossHealthBar').style.width = `${bossHealthPercent}%`;
}

// Add log entry
function addCombatLogEntry(text, type = '') {
    const entry = document.createElement('div');
    entry.className = `combat-log-entry ${type}`;
    entry.textContent = text;
    const logContainer = document.getElementById('combatLog');
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Calculate damage
// Calculate damage with debug info
function calculateDamage(attacker, defender, attackerName, defenderName) {
    let debugInfo = `${attackerName} attacks ${defenderName}:\n`;
    
    // Base damage with some randomness
    const damageMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const baseDamage = Math.floor(attacker.strength * damageMultiplier);
    debugInfo += `Base damage: ${attacker.strength} × ${damageMultiplier.toFixed(2)} = ${baseDamage}\n`;
    
    // Apply defense
    const defenseReduction = Math.floor(defender.defense * 0.5);
    const damageAfterDefense = Math.max(1, baseDamage - defenseReduction);
    debugInfo += `Defense reduction: ${baseDamage} - ${defenseReduction} = ${damageAfterDefense}\n`;
    
    // Check for evasion
    const evasionChance = Math.max(0.05, Math.min(0.30, 0.05 + (defender.dexterity - attacker.dexterity) * 0.01));
    const evasionRoll = Math.random();
    debugInfo += `Evasion chance: ${(evasionChance * 100).toFixed(1)}% (rolled ${(evasionRoll * 100).toFixed(1)}%)\n`;
    
    if (evasionRoll < evasionChance) {
        debugInfo += `EVADED!\n`;
        updateDebugDisplay(debugInfo);
        return { damage: 0, evaded: true, critical: false };
    }
    
    // Check for critical hit
    const critChance = Math.max(0.05, Math.min(0.30, 0.05 + (attacker.dexterity - defender.dexterity) * 0.01));
    const critRoll = Math.random();
    debugInfo += `Crit chance: ${(critChance * 100).toFixed(1)}% (rolled ${(critRoll * 100).toFixed(1)}%)\n`;
    
    const isCritical = critRoll < critChance;
    const finalDamage = isCritical ? damageAfterDefense * 2 : damageAfterDefense;
    
    if (isCritical) {
        debugInfo += `CRITICAL HIT! Damage doubled: ${damageAfterDefense} × 2 = ${finalDamage}\n`;
    } else {
        debugInfo += `Final damage: ${finalDamage}\n`;
    }
    
    updateDebugDisplay(debugInfo);
    return { damage: finalDamage, evaded: false, critical: isCritical };
}

// Update debug display
function updateDebugDisplay(info) {
    const debugElement = document.getElementById('combatCalcDebug');
    if (debugElement) {
        debugElement.innerHTML = `<pre>${info}</pre>`;
    }
}

// Execute one combat turn
function executeCombatTurn(isPlayerTurn) {
    turnCount++;
    
    const attacker = isPlayerTurn ? playerCombatStats : bossCombatStats;
    const defender = isPlayerTurn ? bossCombatStats : playerCombatStats;
    const attackerName = isPlayerTurn ? "Player" : bossCombatStats.name;
    const defenderName = isPlayerTurn ? bossCombatStats.name : "Player";
    
    const result = calculateDamage(attacker, defender, attackerName, defenderName);
    
    let logText = `Turn ${turnCount}: ${attackerName} attacks. `;
    let logType = isPlayerTurn ? 'player-turn' : 'boss-turn';
    
    if (result.evaded) {
        logText += `Miss! ${defenderName} evaded.`;
        logType += ' miss';
    } else {
        if (result.critical) {
            logText += `Critical hit! `;
            logType += ' critical';
        }
        logText += `${result.damage} damage dealt. `;
        defender.currentHP -= result.damage;
        logText += `${defenderName} HP: ${Math.max(0, defender.currentHP)}`;
    }
    
    addCombatLogEntry(logText, logType);
    updateCombatUI();
    
    // Check for victory
    if (defender.currentHP <= 0) {
        combatInProgress = false;
        const winner = isPlayerTurn ? "Player" : bossCombatStats.name;
        addCombatLogEntry(`\n${winner} wins!`, 'critical');
        document.getElementById('startCombatBtn').disabled = true;
        document.getElementById('combatBackBtn').classList.remove('hidden');
        return false; // Combat ended
    }
    
    return true; // Combat continues
}

// Start combat
async function startCombat() {
    if (combatInProgress) return;
    
    combatInProgress = true;
    turnCount = 0;
    document.getElementById('startCombatBtn').disabled = true;
    
    addCombatLogEntry("Combat begins!", 'critical');
    
    // Combat loop - continue until someone wins
    let isPlayerTurn = true;
    while (combatInProgress) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay per turn (faster!)
        
        const continuesCombat = executeCombatTurn(isPlayerTurn);
        
        if (!continuesCombat) break;
        
        isPlayerTurn = !isPlayerTurn; // Alternate turns
    }
}

// Return from combat
function returnFromCombat() {
    document.getElementById('combatScreen').classList.add('hidden');
    document.getElementById('characterScreen').classList.remove('hidden');
}

// Calculate win probability based on stats
function calculateWinProbability(player, boss) {
    // Simple win probability based on total stats
    const playerTotal = player.strength + player.defense + player.dexterity + (player.vitality * 0.5);
    const bossTotal = boss.strength + boss.defense + boss.dexterity + (boss.vitality * 0.5);
    
    // Calculate probability (sigmoid function for smooth 0-100% range)
    const ratio = playerTotal / bossTotal;
    const winChance = 100 / (1 + Math.exp(-3 * (ratio - 1)));
    
    return Math.round(winChance);
}

// Initialize character system on page load
document.addEventListener('DOMContentLoaded', function() {
    loadEquippedGear();
});


console.log('✅ RunRPG JavaScript fully loaded!');