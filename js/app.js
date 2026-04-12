/* 
   VALTI MOMENTS - Cotizador Funcional con Catálogo Real (v12)
   Pricing Engine + Multi-Step Form + WhatsApp Integration
*/

// =============================================
// PRICING DATABASE (from official catalog)
// =============================================
const PRICING = {
    snacksSalados: {
        '50':  { '6oz': 3500,  '12oz': 4500  },
        '100': { '6oz': 5150,  '12oz': 6150  },
        '150': { '6oz': 6800,  '12oz': 7800  },
        '200': { '6oz': 8450,  '12oz': 9450  }
    },
    snacksDulces: {
        '50':  { '6oz': 3250,  '12oz': 4500  },
        '100': { '6oz': 4350,  '12oz': 5850  },
        '150': { '6oz': 5450,  '12oz': 7200  },
        '200': { '6oz': 6550,  '12oz': 8550  }
    },
    hotCakes: {
        '50': 4150, '100': 5400, '150': 6650, '200': 7900
    },
    hotDogsClasico: {
        '50': 2850, '100': 4250, '150': 5650, '200': 7050
    },
    hotDogsPremium: {
        '50': 3450, '100': 5050, '150': 6650, '200': 8250
    }
};

// =============================================
// FORM STATE
// =============================================
let currentFlowIndex = 0;
let flowSequence = [1, 2, 3, 4, 5, 6, 7];
let currentStep = 1;

const formData = {
    services: [],
    saladoConfig: {
        papas: [], fv: [], gomitas: [],
        cacahuates: [], dulces_s: [], chilitos: []
    },
    // dulcesConfig se omitió ya que incluye todo.
    hotdogEstilo: '',
    hmbPapas: '',
    chilSalsa: '',
    chilProteina: '',
    people: '',
    vasoSize: '6oz',
    event: '',
    date: '',
    location: '',
    venue: '',
    name: '',
    wa: ''
};

document.addEventListener('DOMContentLoaded', () => {

    // LOAD ADMIN CONFIG FOR NEW BARS FROM CLOUD (Non-blocking)
    const BIN_ID = "69d0469aaaba882197c18f85";
    const API_KEY = "$2a$10$q9Z//Fah.V6UxECh9kojoORPHn.xNOOWqZR1wiL05zK.7SB2jWp.W";
    
    async function initCloudConfig() {
        let cloudConfig = { hmb: false, chil: false };
        try {
            const cacheTime = localStorage.getItem('valtiCloudCacheTime');
            const now = Date.now();
            if(cacheTime && now - cacheTime < 30000) {
                cloudConfig = JSON.parse(localStorage.getItem('valtiCloudConfig'));
            } else {
                const resp = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": API_KEY } });
                const data = await resp.json();
                cloudConfig = data.record;
                localStorage.setItem('valtiCloudConfig', JSON.stringify(cloudConfig));
                localStorage.setItem('valtiCloudCacheTime', now);
            }
        } catch(e) { console.error("Error loading config", e); }

        if(cloudConfig.hmb === true) {
            const catHmb = document.getElementById('catalogo-hmb');
            const optHmb = document.getElementById('opt-hmb');
            if(catHmb) catHmb.style.display = 'block';
            if(optHmb) optHmb.style.display = 'flex';
        }
        if(cloudConfig.chil === true) {
            const catChil = document.getElementById('catalogo-chil');
            const optChil = document.getElementById('opt-chil');
            if(catChil) catChil.style.display = 'block';
            if(optChil) optChil.style.display = 'flex';
        }
    }
    
    // Ejecutar asincronamente sin bloquear la carga del splash
    initCloudConfig();

    // =============================================
    // INTRO SPLASH & REVEAL
    // =============================================
    const splashTL = gsap.timeline({
        onComplete: () => {
            document.getElementById('intro').style.display = 'none';
        }
    });

    splashTL.to('#splash-logo', { scale: 1, opacity: 1, duration: 2.2, ease: 'power2.out', delay: 0.5 });
    splashTL.to('#intro', { opacity: 0, scale: 1.1, duration: 1.5, ease: 'power3.inOut', delay: 0.8 });
    splashTL.to('#app', { opacity: 1, visibility: 'visible', duration: 1.5, ease: 'power2.out' }, '-=0.5');
    splashTL.to('.reveal', { opacity: 1, y: 0, duration: 1.5, stagger: 0.2, ease: 'power4.out' }, '-=1');



    // =============================================
    // MENU OVERLAY
    // =============================================
    window.openMenu = () => document.getElementById('menu-view').classList.add('open');
    window.closeMenu = () => document.getElementById('menu-view').classList.remove('open');

    // =============================================
    // FORM: OPEN / CLOSE
    // =============================================
    window.openForm = () => {
        document.getElementById('form-view').classList.add('open');
        updateStepUI();
    };

    window.closeForm = () => {
        document.getElementById('form-view').classList.remove('open');
    };

    // =============================================
    // STEP 1: TOGGLE SERVICES (single-select)
    // =============================================
    window.toggleService = (el) => {
        const parent = el.parentElement;
        parent.querySelectorAll('.option-card').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');

        const val = el.getAttribute('data-val');
        formData.services = [val];

        rebuildFlow();
        validateStep(1);
    };

    function rebuildFlow() {
        let f = [1];
        if (formData.services.includes('Snacks Salados')) f.push('1b');
        if (formData.services.includes('Snacks Dulces')) f.push('1c'); // Informativo
        if (formData.services.includes('Hot Dogs')) f.push('1d');
        if (formData.services.includes('Hamburguesas')) f.push('1e');
        if (formData.services.includes('Chilaquiles')) f.push('1f');
        f.push(2);
        // Only show vaso size step if snacks are selected
        const hasSnacks = formData.services.includes('Snacks Salados') || formData.services.includes('Snacks Dulces');
        if (hasSnacks) f.push('2b');
        f.push(3, 4, 5, 6, 7);
        flowSequence = f;
    }

    // =============================================
    // STEP 1b/1c: CATEGORY CHIP SELECTOR (max 3 per category)
    // =============================================
    window.toggleCatChip = (el, barType, category) => {
        const config = barType === 'salado' ? formData.saladoConfig : formData.dulceConfig;
        const val = el.innerText;

        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            config[category] = config[category].filter(i => i !== val);
        } else {
            if (config[category].length < 3) {
                el.classList.add('selected');
                config[category].push(val);
            } else {
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 500);
                return;
            }
        }

        // Update counter
        const counter = document.getElementById(`cnt-${category}`);
        if (counter) counter.textContent = `${config[category].length}/3`;
        validateStep(currentStep);
    };

    // =============================================
    // STEP OPTIONS (Single Choice)
    // =============================================
    window.selectStepOption = (el, stepId) => {
        const parent = el.parentElement;
        parent.querySelectorAll('.option-card, .pill-option').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');

        const val = el.getAttribute('data-val');

        if (stepId === '1d_estilo') formData.hotdogEstilo = val;
        if (stepId === '1e_papas') formData.hmbPapas = val;
        if (stepId === '1f_salsa') formData.chilSalsa = val;
        if (stepId === '1f_proteina') formData.chilProteina = val;
        if (stepId === 2) formData.people = parseInt(val);
        if (stepId === '2b') formData.vasoSize = val;
        if (stepId === 3) formData.event = val;

        validateStep(currentStep);
    };

    // =============================================
    // VALIDATION ENGINE
    // =============================================
    window.validateStep = (step) => {
        let isValid = false;

        if (step === 1) isValid = formData.services.length > 0;

        if (step === '1b') {
            // At least 1 item from any category
            const total = Object.values(formData.saladoConfig).flat().length;
            isValid = total > 0;
        }

        if (step === '1c') isValid = true; // Informativo, siempre válido

        if (step === '1d') isValid = !!formData.hotdogEstilo;
        if (step === '1e') isValid = !!formData.hmbPapas;
        if (step === '1f') isValid = !!formData.chilSalsa && !!formData.chilProteina;
        if (step === 2) isValid = !!formData.people;
        if (step === '2b') isValid = !!formData.vasoSize;
        if (step === 3) isValid = !!formData.event;

        if (step === 4) {
            formData.date = document.getElementById('event-date').value;
            isValid = !!formData.date;
        }

        if (step === 5) {
            formData.location = document.getElementById('event-location').value;
            formData.venue = document.getElementById('event-venue').value;
            isValid = formData.location.length > 3;
        }

        if (step === 6) {
            formData.name = document.getElementById('contact-name').value;
            formData.wa = document.getElementById('contact-wa').value;
            isValid = formData.name.length > 2 && formData.wa.length > 7;
        }

        if (step === 7) isValid = true; // summary step, always valid

        document.getElementById('btn-next').disabled = !isValid;
    };

    // =============================================
    // STEP NAVIGATION
    // =============================================
    window.changeStep = (dir) => {
        let newIndex = currentFlowIndex + dir;

        if (newIndex >= flowSequence.length) {
            sendFinalInquiry();
            return;
        }

        if (newIndex < 0) return;

        const currentStepId = flowSequence[currentFlowIndex];
        const nextStepId = flowSequence[newIndex];

        const fromEl = document.getElementById(`step-${currentStepId}`);
        const toEl = document.getElementById(`step-${nextStepId}`);

        if (fromEl) fromEl.classList.remove('active');
        if (toEl) toEl.classList.add('active');

        currentFlowIndex = newIndex;
        currentStep = nextStepId;

        // Build quote summary when arriving at step 7
        if (currentStep === 7) buildQuoteSummary();

        updateStepUI();
    };

    function updateStepUI() {
        const percent = ((currentFlowIndex + 1) / flowSequence.length) * 100;
        document.getElementById('form-progress').style.width = `${percent}%`;
        document.getElementById('step-counter').innerText = `${currentFlowIndex + 1} / ${flowSequence.length}`;
        document.getElementById('btn-prev').style.visibility = (currentFlowIndex === 0) ? 'hidden' : 'visible';

        const isLast = currentFlowIndex === (flowSequence.length - 1);
        document.getElementById('btn-next').innerText = isLast ? 'Enviar por WhatsApp' : 'Siguiente';

        validateStep(currentStep);
    }

    // =============================================
    // PRICING ENGINE
    // =============================================
    function calculatePrice() {
        const pax = formData.people;
        const vaso = formData.vasoSize || '6oz';
        let total = 0;
        const breakdown = [];

        if (!pax) return { total: 0, breakdown: [] };

        if (formData.services.includes('Snacks Salados')) {
            const p = PRICING.snacksSalados[pax]?.[vaso] || 0;
            total += p;
            breakdown.push({ name: `Barra Snacks Salados (${pax} pax, ${vaso})`, price: p });
        }

        if (formData.services.includes('Snacks Dulces')) {
            const p = PRICING.snacksDulces[pax]?.[vaso] || 0;
            total += p;
            breakdown.push({ name: `Barra Snacks Dulces (${pax} pax, ${vaso})`, price: p });
        }

        if (formData.services.includes('Hot Cakes Bar')) {
            const p = PRICING.hotCakes[pax] || 0;
            total += p;
            breakdown.push({ name: `Hot Cakes Bar (${pax} piezas)`, price: p });
        }

        if (formData.services.includes('Hot Dogs')) {
            const isPremium = formData.hotdogEstilo === 'Paquete Premium';
            const table = isPremium ? PRICING.hotDogsPremium : PRICING.hotDogsClasico;
            const p = table[pax] || 0;
            total += p;
            breakdown.push({ name: `Hot Dogs ${formData.hotdogEstilo} (${pax} pzas)`, price: p });
        }

        if (formData.services.includes('Hamburguesas')) {
            // Precio por confirmar (0)
            breakdown.push({ name: `Hamburguesas con papas ${formData.hmbPapas} (${pax} pax) - Precio por confirmar`, price: 0 });
        }

        if (formData.services.includes('Chilaquiles')) {
            // Precio por confirmar (0)
            breakdown.push({ name: `Chilaquiles ${formData.chilSalsa} / ${formData.chilProteina} (${pax} pax) - Precio por confirmar`, price: 0 });
        }

        return { total, breakdown };
    }

    // =============================================
    // QUOTE SUMMARY BUILDER (Step 7)
    // =============================================
    function buildQuoteSummary() {
        const { total, breakdown } = calculatePrice();
        const summaryEl = document.getElementById('quote-summary');
        const totalEl = document.getElementById('quote-total');

        let html = '';

        // Services breakdown
        breakdown.forEach(item => {
            html += `<div class="quote-row">
                <span>${item.name}</span>
                <strong>$${item.price.toLocaleString()}</strong>
            </div>`;
        });

        // Selections detail
        html += '<div class="quote-details">';

        if (formData.services.includes('Snacks Salados')) {
            const items = Object.entries(formData.saladoConfig)
                .filter(([_, arr]) => arr.length > 0)
                .map(([cat, arr]) => arr.join(', '))
                .join(' · ');
            if (items) html += `<p class="quote-detail-line"><i class="ri-fire-line"></i> Salados: ${items}</p>`;
        }

        if (formData.services.includes('Snacks Dulces')) {
            html += `<p class="quote-detail-line"><i class="ri-cake-2-line"></i> Dulces: Incluye las 7 frutas, los 7 postres y los 4 jarabes del catálogo.</p>`;
        }

        if (formData.services.includes('Hot Dogs')) {
            html += `<p class="quote-detail-line"><i class="ri-bread-line"></i> ${formData.hotdogEstilo}</p>`;
        }

        if (formData.services.includes('Hamburguesas')) {
            html += `<p class="quote-detail-line"><i class="ri-restaurant-line"></i> Papas: ${formData.hmbPapas}</p>`;
        }
        
        if (formData.services.includes('Chilaquiles')) {
            html += `<p class="quote-detail-line"><i class="ri-bowl-line"></i> ${formData.chilSalsa} / Proteína: ${formData.chilProteina}</p>`;
        }

        html += `<p class="quote-detail-line"><i class="ri-calendar-line"></i> ${formData.date}</p>`;
        html += `<p class="quote-detail-line"><i class="ri-map-pin-line"></i> ${formData.location}${formData.venue ? ' — ' + formData.venue : ''}</p>`;
        html += `<p class="quote-detail-line"><i class="ri-group-line"></i> ${formData.event} · ${formData.people} personas</p>`;
        html += '</div>';

        summaryEl.innerHTML = html;
        totalEl.innerHTML = `<span>Estimado total</span><strong>$${total.toLocaleString()} MXN</strong>`;
    }

    // =============================================
    // WHATSAPP MESSAGE BUILDER
    // =============================================
    function sendFinalInquiry() {
        const phone = '522292451954';
        const { total, breakdown } = calculatePrice();

        let msg = "*COTIZACION VALTI MOMENTS*\n";
        msg += "------------------------\n\n";

        msg += "*Servicios Seleccionados:*\n";
        breakdown.forEach(item => {
            msg += `> ${item.name}: $${item.price.toLocaleString()}\n`;
        });

        // Snacks Salados detail
        if (formData.services.includes('Snacks Salados')) {
            msg += "\n*Detalle Snacks Salados:*\n";
            Object.entries(formData.saladoConfig).forEach(([cat, arr]) => {
                if (arr.length > 0) {
                    const catNames = {
                        papas: 'Papas', fv: 'Frutas/Verduras', gomitas: 'Gomitas',
                        cacahuates: 'Cacahuates', dulces_s: 'Dulces', chilitos: 'Chilitos'
                    };
                    msg += `  - ${catNames[cat]}: ${arr.join(', ')}\n`;
                }
            });
        }

        // Snacks Dulces detail
        if (formData.services.includes('Snacks Dulces')) {
            msg += "\n*Detalle Snacks Dulces:*\n";
            msg += `  - Incluye variedad de frutas, postres y jarabes completos.\n`;
        }

        // Hot Dogs
        if (formData.services.includes('Hot Dogs')) {
            msg += `\n*Hot Dogs:* ${formData.hotdogEstilo}\n`;
        }

        // Hamburguesas
        if (formData.services.includes('Hamburguesas')) {
            msg += `\n*Barra de Hamburguesas:*\n`;
            msg += `  - Papas elegidas: ${formData.hmbPapas}\n`;
        }

        // Chilaquiles
        if (formData.services.includes('Chilaquiles')) {
            msg += `\n*Barra de Chilaquiles:*\n`;
            msg += `  - Salsa: ${formData.chilSalsa}\n`;
            msg += `  - Proteína: ${formData.chilProteina}\n`;
        }

        msg += "\n------------------------\n";
        msg += `*ESTIMADO TOTAL: $${total.toLocaleString()} MXN*\n`;
        msg += "------------------------\n\n";

        msg += `*Fecha:* ${formData.date}\n`;
        msg += `*Lugar:* ${formData.location}${formData.venue ? ' - ' + formData.venue : ''}\n`;
        msg += `*Evento:* ${formData.event}\n`;
        msg += `*Invitados:* ${formData.people}\n\n`;

        msg += `*Contacto:* ${formData.name}\n`;
        msg += `*WhatsApp:* ${formData.wa}\n\n`;

        msg += "Me pueden confirmar disponibilidad y precio final? Gracias!";

        const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
        window.open(url, '_blank');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    // =============================================
    // TILT EFFECT
    // =============================================
    VanillaTilt.init(document.querySelector('.brand-prof-unit'), { max: 8, speed: 400, glare: true, 'max-glare': 0.2 });

    // =============================================
    // FLOATING FOOD PARALLAX ON SCROLL
    // =============================================
    const foodItems = document.querySelectorAll('.food-item');
    
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        foodItems.forEach(item => {
            const speed = parseFloat(item.getAttribute('data-speed'));
            const yOffset = -(scrollY * speed);
            item.style.transform = `translateY(${yOffset}px) rotate(${scrollY * speed * 0.05}deg)`;
        });
    }, { passive: true });

    // =============================================
    // LIGHTBOX
    // =============================================
    window.openLightbox = (src) => {
        const lb = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        if(lb && img) {
            img.src = src;
            lb.classList.add('active');
        }
    };

    window.closeLightbox = () => {
        const lb = document.getElementById('lightbox');
        if(lb) {
            lb.classList.remove('active');
            setTimeout(() => {
                document.getElementById('lightbox-img').src = "";
            }, 300);
        }
    };

});
