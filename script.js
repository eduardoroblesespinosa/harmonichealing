document.addEventListener('DOMContentLoaded', async () => {
    const gallery = document.getElementById('gallery');
    const animationModal = new bootstrap.Modal(document.getElementById('animationModal'));
    const modalTitle = document.getElementById('animationModalLabel');
    const modalImage = document.getElementById('modal-img');
    const modalPhrase = document.getElementById('modal-phrase');
    const modalDetails = document.getElementById('modal-details');
    const frequencySlider = document.getElementById('frequency-slider');
    const pulseAnimation = document.querySelector('.pulse-animation');
    const muteButton = document.getElementById('mute-button');

    let audioContext;
    let masterGain;
    let oscillators = [];
    let currentBaseFrequencies = [];
    let isMuted = false;
    
    const MUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-volume-mute-fill" viewBox="0 0 16 16"><path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.392-1.89a.5.5 0 0 1 .5.04zM10.025 8.025A4.486 4.486 0 0 0 11.5 6.5v.195c0 .341.272.615.61.615.337 0 .609-.274.609-.615v-.195a5.484 5.484 0 0 1-1.67 3.323l.745.745A6.473 6.473 0 0 0 13 6.5v.195c0 .341.272.615.61.615.337 0 .609-.274.609-.615v-.195a7.474 7.474 0 0 1-2.138 4.223l.745.745a8.473 8.473 0 0 0 2.56-5.162v.195c0 .341.272.615.61.615.337 0 .609-.274.609-.615v-.195a9.47 9.47 0 0 0-3.008-6.11l-.747.747A8.452 8.452 0 0 1 12.11 3H12c-.337 0-.61.274-.61.615v.195A7.452 7.452 0 0 0 9.28 6.28l.745.745zm-1.27.746-1.5-1.5-1.5 1.5-1.5-1.5-1.5 1.5-1.5-1.5-1.5 1.5-1.5-1.5.75.75.75.75.75.75.75zm3.018.745.745-.745-1.5-1.5-.745.745 1.5 1.5z"/></svg>`;
    const UNMUTE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-volume-up-fill" viewBox="0 0 16 16"><path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/><path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.482 5.482 0 0 1 11.025 8a5.482 5.482 0 0 1-1.61 3.89l.706.706z"/><path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.392-1.89a.5.5 0 0 1 .5.04z"/></svg>`;

    function updateMuteButton() {
        muteButton.innerHTML = isMuted ? MUTE_ICON : UNMUTE_ICON;
        if (masterGain) {
            masterGain.gain.value = isMuted ? 0 : 0.05;
        }
    }

    function initializeAudio() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                masterGain = audioContext.createGain();
                updateMuteButton();
                masterGain.connect(audioContext.destination);
            } catch (e) {
                console.error("Web Audio API is not supported in this browser", e);
                muteButton.disabled = true;
            }
        }
    }

    function playBinauralBeats(baseFrequencies) {
        stopBinauralBeats();
        if (!audioContext) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const beatFrequency = parseInt(frequencySlider.value);
        currentBaseFrequencies = baseFrequencies;

        baseFrequencies.forEach(baseFreq => {
            if (isNaN(baseFreq)) return;

            // Left Ear
            const oscL = audioContext.createOscillator();
            oscL.type = 'sine';
            oscL.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
            const pannerL = audioContext.createStereoPanner();
            pannerL.pan.setValueAtTime(-1, audioContext.currentTime);
            oscL.connect(pannerL).connect(masterGain);
            oscL.start();
            oscillators.push(oscL);

            // Right Ear
            const oscR = audioContext.createOscillator();
            oscR.type = 'sine';
            oscR.frequency.setValueAtTime(baseFreq + beatFrequency, audioContext.currentTime);
            const pannerR = audioContext.createStereoPanner();
            pannerR.pan.setValueAtTime(1, audioContext.currentTime);
            oscR.connect(pannerR).connect(masterGain);
            oscR.start();
            oscillators.push(oscR);
        });
    }

    function stopBinauralBeats() {
        oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) { /* Ignore errors on stopping already stopped oscillators */ }
        });
        oscillators = [];
        currentBaseFrequencies = [];
    }

    function updateBeatFrequency(newBeatFrequency) {
        if (!audioContext || oscillators.length === 0) return;

        for (let i = 0; i < currentBaseFrequencies.length; i++) {
            const baseFreq = currentBaseFrequencies[i];
            const oscR = oscillators[i * 2 + 1]; // Right oscillator
            if (oscR) {
                oscR.frequency.setTargetAtTime(baseFreq + newBeatFrequency, audioContext.currentTime, 0.015);
            }
        }
    }

    const cancerData = [
        {
            name: "Breast Cancer",
            phrase: "Within you is the strength of a thousand mountains. This is a path to discovering your own power.",
            imageName: "breast_cancer.png",
            frequency: "432 Hz + 963 Hz",
            colors: "Rose Quartz & Violet",
            geometry: "Flower of Life"
        },
        {
            name: "Lung Cancer",
            phrase: "Every breath is a victory. Let your spirit soar on the winds of courage.",
            imageName: "lung_cancer.png",
            frequency: "741 Hz + 852 Hz",
            colors: "Jade Green & Turquoise",
            geometry: "Breathing Toroid"
        },
        {
            name: "Prostate Cancer",
            phrase: "Your journey is one of endurance and wisdom. Stand tall in your unwavering resolve.",
            imageName: "prostate_cancer.png",
            frequency: "444 Hz + 741 Hz",
            colors: "Indigo Blue & Copper",
            geometry: "Merkaba Inner Cube"
        },
        {
            name: "Colon Cancer",
            phrase: "You are navigating the winding rivers of life. Trust in your resilience to find the open sea.",
            imageName: "colon_cancer.png",
            frequency: "417 Hz + 528 Hz",
            colors: "Electric Blue & Amber",
            geometry: "Fibonacci Spiral"
        },
        {
            name: "Melanoma",
            phrase: "Your light shines from within, too bright to be overshadowed. Embrace your radiant spirit.",
            imageName: "melanoma.png",
            frequency: "285 Hz + 963 Hz",
            colors: "Ultraviolet & Magenta",
            geometry: "Solar Hexagon"
        },
        {
            name: "Leukemia",
            phrase: "Within your very essence flows a current of immense strength and renewal. You are life, remade.",
            imageName: "leukemia.png",
            frequency: "528 Hz + 963 Hz",
            colors: "Gold & White",
            geometry: "12-Pointed Star"
        },
        {
            name: "Pancreatic Cancer",
            phrase: "In the core of your being lies a hidden strength. Unearth it and let it guide you.",
            imageName: "pancreatic_cancer.png",
            frequency: "528 Hz + 888 Hz",
            colors: "Liquid Gold & Olive",
            geometry: "Vesica Piscis"
        },
        {
            name: "Liver Cancer",
            phrase: "You are a vessel of regeneration and strength. Trust in your body's profound ability to heal.",
            imageName: "liver_cancer.png",
            frequency: "639 Hz + 1111 Hz",
            colors: "Solar Orange & Indigo",
            geometry: "Metatron's Cube"
        },
        {
            name: "Ovarian Cancer",
            phrase: "From the deepest source of life comes your greatest strength. You are a creator of hope.",
            imageName: "ovarian_cancer.png",
            frequency: "396 Hz + 417 Hz",
            colors: "Teal & Pearl White",
            geometry: "Vesica Piscis with Pearl"
        },
        {
            name: "Brain Cancer",
            phrase: "Your mind is a universe of potential. Harness its infinite power to forge new pathways of healing.",
            imageName: "brain_cancer.png",
            frequency: "963 Hz + 1440 Hz",
            colors: "Violet & Silver",
            geometry: "Crystal Octahedron"
        },
        {
            name: "Stomach Cancer",
            phrase: "You are the center of your own strength. Digest challenges and transform them into nourishment for your spirit.",
            imageName: "stomach_cancer.png",
            frequency: "396 Hz + 639 Hz",
            colors: "Ruby Red & White",
            geometry: "Sacred Triangle"
        }
    ];

    function createGalleryCard(item) {
        const col = document.createElement('div');
        col.className = 'col-lg-3 col-md-4 col-sm-6';

        const card = document.createElement('div');
        card.className = 'card h-100 cancer-card';
        card.dataset.name = item.name;
        card.dataset.phrase = item.phrase;
        card.dataset.image = item.imageName;
        card.dataset.frequency = item.frequency;
        card.dataset.colors = item.colors;
        card.dataset.geometry = item.geometry;

        card.innerHTML = `
            <img src="${item.imageName}" class="card-img-top" alt="${item.name}">
            <div class="card-body text-center">
                <h5 class="card-title">${item.name}</h5>
            </div>
        `;

        card.addEventListener('click', () => {
            modalTitle.textContent = item.name;
            modalImage.src = item.imageName;
            modalPhrase.textContent = `"${item.phrase}"`;
            
            modalDetails.innerHTML = `
                <div class="col-md-4">
                    <h6 class="text-muted">Healing Frequency (Hz)</h6>
                    <p>${item.frequency}</p>
                </div>
                <div class="col-md-4">
                    <h6 class="text-muted">Energy Colors</h6>
                    <p>${item.colors}</p>
                </div>
                <div class="col-md-4">
                    <h6 class="text-muted">Sacred Geometry</h6>
                    <p>${item.geometry}</p>
                </div>
            `;

            initializeAudio();
            const freqs = item.frequency.replace(/Hz/g, '').split('+').map(f => parseFloat(f.trim()));
            playBinauralBeats(freqs);

            animationModal.show();
        });

        col.appendChild(card);
        gallery.appendChild(col);
    }
    
    cancerData.forEach(createGalleryCard);
    updateMuteButton();

    frequencySlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        const duration = 11 - value; // Invert so higher slider value = faster animation
        pulseAnimation.style.animationDuration = `${duration}s`;
        updateBeatFrequency(value);
    });
    
    // Reset animation and stop sound on modal close
    document.getElementById('animationModal').addEventListener('hidden.bs.modal', () => {
        frequencySlider.value = 5;
        pulseAnimation.style.animationDuration = '5s';
        stopBinauralBeats();
    });

    muteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        updateMuteButton();
    });
});