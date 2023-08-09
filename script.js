const malts = {
    "Pils": { "type": "Base", "lovibond": 1.5 },
    "Munich": { "type": "Base", "lovibond": 5 },
    "Vienna": { "type": "Base", "lovibond": 4 },
    "Corn": { "type": "Specialty", "lovibond": 0.5 },
    "Crystal 60": { "type": "Crystal", "lovibond": 60 },
    "Carafa I": { "type": "Roasted", "lovibond": 340 }
};

function updateColor() {
    const baseToggle = document.getElementById('baseToggle').checked;
    const specialtyToggle = document.getElementById('specialtyToggle').checked;
    const crystalToggle = document.getElementById('crystalToggle').checked;
    const roastedToggle = document.getElementById('roastedToggle').checked;

    // Disable/Enable the sliders based on the toggle status
    document.getElementById('baseMalt').disabled = !baseToggle;
    document.getElementById('specialtyMalt').disabled = !specialtyToggle;
    document.getElementById('crystalMalt').disabled = !crystalToggle;
    document.getElementById('roastedMalt').disabled = !roastedToggle;

    // Fetch the slider value if the malt type is toggled on, otherwise use 0
    const baseMaltValue = baseToggle ? parseFloat(document.getElementById('baseMalt').value) / 100 : 0;
    const specialtyMaltValue = specialtyToggle ? parseFloat(document.getElementById('specialtyMalt').value) / 100 : 0;
    const crystalMaltValue = crystalToggle ? parseFloat(document.getElementById('crystalMalt').value) / 100 : 0;
    const roastedMaltValue = roastedToggle ? parseFloat(document.getElementById('roastedMalt').value) / 100 : 0;

    const rgb = getCombinedMaltRgb(baseMaltValue, specialtyMaltValue, crystalMaltValue, roastedMaltValue);

    const displayElement = document.getElementById('displayColor');
    displayElement.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function interpolate(poles, value) {
    if (poles.length === 2) {
        // Linear interpolation
        return {
            c: poles[0].c + value * (poles[1].c - poles[0].c),
            m: poles[0].m + value * (poles[1].m - poles[0].m),
            y: poles[0].y + value * (poles[1].y - poles[0].y),
            k: poles[0].k + value * (poles[1].k - poles[0].k)
        };
    } else if (poles.length === 3) {
        if (value < 0.5) {
            return interpolate([poles[0], poles[1]], value * 2);
        } else {
            return interpolate([poles[1], poles[2]], (value - 0.5) * 2);
        }
    }
}

function getCombinedMaltRgb(baseValue, specialtyValue, crystalValue, roastedValue) {
    const poles = {
        base: [
            { c: 0, m: 0, y: 0.25, k: 0 },
            { c: 0, m: 0, y: 1, k: 0 },
            { c: 0, m: 0.5, y: 1, k: 0 }
        ],
        specialty: [
            { c: 0, m: 0.5, y: 1, k: 0 },
            { c: 0, m: 1, y: 1, k: 0.5 }
        ],
        crystal: [
            { c: 0, m: 0.75, y: 1, k: 0 },
            { c: 0, m: 1, y: 1, k: 0.25 },
            { c: 0, m: 1, y: 1, k: 0.75 }
        ],
        roasted: [
            { c: 0, m: 0.5, y: 1, k: 0.5 },
            { c: 0, m: 1, y: 1, k: 1 }
        ]
    };

    const baseCmyk = interpolate(poles.base, baseValue);
    const specialtyCmyk = interpolate(poles.specialty, specialtyValue);
    const crystalCmyk = interpolate(poles.crystal, crystalValue);
    const roastedCmyk = interpolate(poles.roasted, roastedValue);

    // Combine the CMYK values (simple average for now)
    // Calculate the sum of all malt values.
    const totalValue = baseValue + specialtyValue + crystalValue + roastedValue;
    
    // Avoid division by zero.
    if (totalValue === 0) return cmykToRgb(0, 0, 0, 0);

    // Calculate the proportion of each malt type.
    const baseProportion = baseValue / totalValue;
    const specialtyProportion = specialtyValue / totalValue;
    const crystalProportion = crystalValue / totalValue;
    const roastedProportion = roastedValue / totalValue;

    const combinedCmyk = {
        c: baseCmyk.c * baseProportion + specialtyCmyk.c * specialtyProportion + crystalCmyk.c * crystalProportion + roastedCmyk.c * roastedProportion,
        m: baseCmyk.m * baseProportion + specialtyCmyk.m * specialtyProportion + crystalCmyk.m * crystalProportion + roastedCmyk.m * roastedProportion,
        y: baseCmyk.y * baseProportion + specialtyCmyk.y * specialtyProportion + crystalCmyk.y * crystalProportion + roastedCmyk.y * roastedProportion,
        k: baseCmyk.k * baseProportion + specialtyCmyk.k * specialtyProportion + crystalCmyk.k * crystalProportion + roastedCmyk.k * roastedProportion,
    };

    // Convert CMYK to RGB
    const rgb = cmykToRgb(combinedCmyk.c, combinedCmyk.m, combinedCmyk.y, combinedCmyk.k);
    return rgb;
}

function cmykToRgb(c, m, y, k) {
    const r = 255 * (1 - c) * (1 - k);
    const g = 255 * (1 - m) * (1 - k);
    const b = 255 * (1 - y) * (1 - k);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

function updateSRM() {
    const batchSize = parseFloat(document.getElementById('batchSize').value);
    
    // Ensure we don't divide by zero
    if (batchSize === 0) return;

    let totalSRM = 0; 

    for (let maltName in malts) {
        const weight = parseFloat(document.getElementById(maltName + 'Weight').value);
        totalSRM += (weight * malts[maltName].lovibond) / batchSize;  // Calculating SRM contribution
    }

    setSliderValuesBySRM(totalSRM);

    // Update the color display
    updateColor();
}

function setSliderValuesBySRM(srm) {
    resetSliders(); // Set all sliders to 0 initially
    
    if (srm <= 10) {
        document.getElementById('baseMalt').value = srm * 10; // as slider goes from 0 to 100, not 0 to 10
    } else if (srm <= 20) {
        document.getElementById('baseMalt').value = 100;
        document.getElementById('specialtyMalt').value = (srm - 10) * 10;
    } else if (srm <= 30) {
        document.getElementById('baseMalt').value = 100;
        document.getElementById('specialtyMalt').value = 100;
        document.getElementById('crystalMalt').value = (srm - 20) * 10;
    } else if (srm <= 40) {
        document.getElementById('baseMalt').value = 100;
        document.getElementById('specialtyMalt').value = 100;
        document.getElementById('crystalMalt').value = 100;
        document.getElementById('roastedMalt').value = (srm - 30) * 10;
    } else {
        // All sliders maxed out if SRM exceeds 40
        document.getElementById('baseMalt').value = 100;
        document.getElementById('specialtyMalt').value = 100;
        document.getElementById('crystalMalt').value = 100;
        document.getElementById('roastedMalt').value = 100;
    }
}

function resetSliders() {
    document.getElementById('baseMalt').value = 0;
    document.getElementById('specialtyMalt').value = 0;
    document.getElementById('crystalMalt').value = 0;
    document.getElementById('roastedMalt').value = 0;
}
