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
    },
    ring: { 
        icon: '💍', 
        names: ['Tarnished Band', 'Ring of Binding', 'Sorcerer\'s Loop', 'Band of the Archon', 'Circle of Reality'] 
    },
    neck: { 
        icon: '📿', 
        names: ['Cracked Trinket', 'Pendant of Souls', 'Amulet of the Magi', 'Relic of Creation', 'Heart of the Universe'] 
    },
    belt: { 
        icon: '🎀', 
        names: ['Frayed Rope', 'Leather Belt', 'Enchanted Sash', 'Girdle of Power', 'Cord of Divinity'] 
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
    let score = 65; // Base score
    
    // Distance factor
    const distanceRatio = distance / userBaseline.distance;
    score += (distanceRatio - 1) * 25;
    
    // Pace factor (better pace = higher score)
    const actualPace = calculatePace(distance, time);
    const paceRatio = userBaseline.pace / actualPace; // Inverted so faster = higher
    score += (paceRatio - 1) * 25;
    
    // Elevation factor
    const elevationRatio = elevation / userBaseline.elevation;
    score += (elevationRatio - 1) * 15;
    
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
    
    // Performance multiplier: -0.5 (terrible) to +1.5 (amazing)
    const performanceMultiplier = (performanceScore - 50) / 50;
    
    // Calculate modified weights based on performance
    const modifiedWeights = {
        common: Math.max(20, baseWeights.common - (performanceMultiplier * 20)),
        uncommon: Math.max(15, baseWeights.uncommon + (performanceMultiplier * 10)),
        rare: Math.max(5, baseWeights.rare + (performanceMultiplier * 15)),
        legendary: Math.max(2, baseWeights.legendary + (performanceMultiplier * 8)),
        mythic: Math.max(0.5, baseWeights.mythic + (performanceMultiplier * 4))
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
        
        // Generate stats based on rarity
        const baseStats = (rarityIndex + 1) * 5;
        const stats = {
            strength: baseStats + Math.floor(Math.random() * 10),
            dexterity: baseStats + Math.floor(Math.random() * 10),
            vitality: baseStats + Math.floor(Math.random() * 10)
        };
        
        loot.push({
            type: randomGearType,
            name: itemName,
            rarity: rarity,
            icon: gear.icon,
            stats: stats,
            timestamp: Date.now()
        });
    }
    
    return loot;
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
    
    const hasSignificantChanges = Object.values(roundedChanges).some(change => Math.abs(change) >= 1);
    const isPositiveImpact = Object.values(roundedChanges).some(change => change >= 1);
    const isNegativeImpact = Object.values(roundedChanges).some(change => change <= -1);
    
    let performanceColor = '#e0e0e0';
    let performanceText = 'Baseline Performance';
    
    if (hasSignificantChanges) {
        if (isPositiveImpact && !isNegativeImpact) {
            performanceColor = '#10B981';
            performanceText = 'Excellent Performance!';
        } else if (isNegativeImpact && !isPositiveImpact) {
            performanceColor = '#EF4444';
            performanceText = 'Below Baseline';
        } else if (isPositiveImpact && isNegativeImpact) {
            performanceColor = '#F59E0B';
            performanceText = 'Mixed Performance';
        }
    }

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
                        <small>PACE /MI</small>
                    </div>
                    <div>
                        <span>${elevation}</span><br>
                        <small>ELEVATION FT</small>
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
                    ${rarities.map(rarity => `
                        <div class="loot-chance-item">
                            <div class="loot-chance-percent rarity-color-${rarity}">${Math.round(lootChances.chances[rarity])}%</div>
                            <div class="rarity-color-${rarity}" style="font-size: 12px; text-transform: uppercase; margin-bottom: 2px;">${rarity}</div>
                            <small class="loot-chance-change ${getChangeClass(roundedChanges[rarity])}">(${roundedChanges[rarity] >= 0 ? '+' : ''}${roundedChanges[rarity]}%)</small>
                        </div>
                    `).join('')}
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
        
        lootElement.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name rarity-color-${item.rarity}">${item.name}</div>
            <div class="item-rarity rarity-color-${item.rarity}">${item.rarity}</div>
            <div class="item-stats">
                <div>⚔️ STR: ${item.stats.strength}</div>
                <div>🏃 DEX: ${item.stats.dexterity}</div>
                <div>❤️ VIT: ${item.stats.vitality}</div>
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

function updateInventoryCount() {
    const count = allLootCollected.length;
    const countElement = document.getElementById('inventoryCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

function showInventory() {
    if (allLootCollected.length === 0) {
        alert('Your inventory is empty! Complete some runs to collect loot.');
        return;
    }
    
    // Create inventory modal
    const modal = document.createElement('div');
    modal.className = 'inventory-modal modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'inventory-modal-content';
    
    // Group items by rarity
    const itemsByRarity = {};
    rarities.forEach(rarity => itemsByRarity[rarity] = []);
    allLootCollected.forEach(item => itemsByRarity[item.rarity].push(item));
    
    let inventoryHtml = `
        <div class="inventory-header">
            <h2>📦 Inventory (${allLootCollected.length} items)</h2>
            <button onclick="this.closest('.modal').remove()" class="inventory-close-btn">✕ Close</button>
        </div>
    `;
    
    // Stats summary
    const rarityCount = {};
    rarities.forEach(rarity => rarityCount[rarity] = itemsByRarity[rarity].length);
    
    inventoryHtml += `
        <div class="inventory-stats-grid">
            ${rarities.map(rarity => `
                <div class="inventory-stat-box ${rarity}">
                    <div class="inventory-stat-label ${rarity}">${rarity}</div>
                    <div class="inventory-stat-count">${rarityCount[rarity]}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Items by rarity
    rarities.reverse().forEach(rarity => {
        if (itemsByRarity[rarity].length > 0) {
            inventoryHtml += `
                <div class="inventory-rarity-section">
                    <h3 class="${rarity}">${rarity} (${itemsByRarity[rarity].length})</h3>
                    <div class="inventory-items-grid">
                        ${itemsByRarity[rarity].map(item => `
                            <div class="inventory-item ${rarity}">
                                <div class="inventory-item-icon">${item.icon}</div>
                                <div class="inventory-item-name ${rarity}">${item.name}</div>
                                <div class="inventory-item-stats">
                                    ⚔️ ${item.stats.strength} | 🏃 ${item.stats.dexterity} | ❤️ ${item.stats.vitality}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });
    rarities.reverse(); // Restore original order
    
    modalContent.innerHTML = inventoryHtml;
    modal.appendChild(modalContent);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Reset data function (for testing/reset)
function resetAllData() {
    if (confirm('Are you sure you want to reset all data? This will clear your baseline settings and delete all collected loot.')) {
        try {
            localStorage.removeItem('runrpg_baseline');
            localStorage.removeItem('runrpg_loot');
            
            // Reset global variables
            userBaseline = {};
            allLootCollected = [];
            currentLoot = [];
            selections = {};
            
            // Show setup screen again
            document.getElementById('setupScreen').classList.remove('hidden');
            document.getElementById('lootSystem').classList.add('hidden');
            
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

console.log('✅ RunRPG JavaScript fully loaded!');