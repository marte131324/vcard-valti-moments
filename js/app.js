/* 
   MANGO & NATA - Cotizador Funcional v2 (Con selección de sabores)
   Pricing Engine + Multi-Step Form + WhatsApp Integration
*/

// =============================================
// PRICING DATABASE
// =============================================
const PRICING = {
    '30 Hielitos': {
        'Clásico': 400,
        'Premium': 550,
        'Edición Especial': 700
    },
    '50 Hielitos': {
        'Clásico': 650,
        'Premium': 900,
        'Edición Especial': 1150
    },
    '100 Hielitos': {
        'Clásico': 1250,
        'Premium': 1750,
        'Edición Especial': 2250
    }
};

const LIMITES_SABORES = {
    '30 Hielitos': 3,
    '50 Hielitos': 5,
    '100 Hielitos': 10
};

// =============================================
// FORM STATE
// =============================================
let currentFlowIndex = 0;
let flowSequence = [1, '1b', '1c', 2, 3, 4, 5, 6];
let currentStep = 1;

const formData = {
    paquete: '',
    base: '',
    sabores: [],
    event: '',
    date: '',
    location: '',
    venue: '',
    name: '',
    wa: ''
};

document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // AUTO DARK MODE
    // =============================================
    function initDarkMode() {
        const hour = new Date().getHours();
        if (hour >= 19 || hour < 6) {
            document.body.classList.add('dark-mode');
        }
    }
    initDarkMode();

    window.toggleDarkMode = () => {
        document.body.classList.toggle('dark-mode');
        const icon = document.querySelector('#dark-mode-btn i');
        if (icon) {
            if (document.body.classList.contains('dark-mode')) {
                icon.className = 'ri-sun-line';
            } else {
                icon.className = 'ri-moon-line';
            }
        }
    };

    // =============================================
    // SNOW PARTICLES
    // =============================================
    function createSnow() {
        const container = document.getElementById('snow-container');
        if (!container) return;
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.width = Math.random() * 6 + 2 + 'px';
            p.style.height = p.style.width;
            p.style.left = Math.random() * 100 + 'vw';
            p.style.animationDuration = Math.random() * 3 + 2 + 's';
            p.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(p);
        }
    }
    createSnow();

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
    // STEP NAVIGATION AND SELECTION
    // =============================================
    window.selectStepOption = (el, stepId) => {
        const parent = el.parentElement;
        parent.querySelectorAll('.option-card, .pill-option').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');

        const val = el.getAttribute('data-val');

        if (stepId === 1) formData.paquete = val;
        if (stepId === '1b') {
            formData.base = val;
            formData.sabores = []; // Reset sabores if base changes
            updateSaboresUI(); // Update DOM to show correct flavors
        }
        if (stepId === 2) formData.event = val;

        validateStep(currentStep);
    };

    // Toggle para los chips de sabores
    window.toggleSabor = (el) => {
        const maxSabores = LIMITES_SABORES[formData.paquete] || 3;
        const val = el.innerText;

        if (el.classList.contains('selected')) {
            el.classList.remove('selected');
            formData.sabores = formData.sabores.filter(i => i !== val);
        } else {
            if (formData.sabores.length < maxSabores) {
                el.classList.add('selected');
                formData.sabores.push(val);
            } else {
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 500);
                return;
            }
        }

        document.getElementById('cnt-sabores').textContent = `${formData.sabores.length}/${maxSabores}`;
        validateStep(currentStep);
    };

    function updateSaboresUI() {
        // Mostrar solo los chips que correspondan a la base seleccionada
        const allGroups = document.querySelectorAll('.sabor-group');
        allGroups.forEach(g => g.style.display = 'none');

        if (formData.base === 'Clásico') {
            document.getElementById('sg-agua').style.display = 'block';
            document.getElementById('sg-gourmet').style.display = 'block';
        } else if (formData.base === 'Premium') {
            document.getElementById('sg-premium').style.display = 'block';
        } else if (formData.base === 'Edición Especial') {
            document.getElementById('sg-especial').style.display = 'block';
        }

        const maxSabores = LIMITES_SABORES[formData.paquete] || 3;
        document.getElementById('cnt-sabores').textContent = `0/${maxSabores}`;
        document.getElementById('max-sabores-text').textContent = maxSabores;

        // Reset all selected chips visually
        document.querySelectorAll('.sabor-chip').forEach(c => c.classList.remove('selected'));
    }

    window.validateStep = (step) => {
        let isValid = false;

        if (step === 1) isValid = !!formData.paquete;
        if (step === '1b') isValid = !!formData.base;
        if (step === '1c') {
            const maxSabores = LIMITES_SABORES[formData.paquete] || 3;
            // Permitimos avanzar si al menos eligió 1 sabor, aunque no sea el máximo
            isValid = formData.sabores.length > 0;
        }
        if (step === 2) isValid = !!formData.event;

        if (step === 3) {
            const dateInput = document.getElementById('event-date');
            formData.date = dateInput.value;
            const BLOCKED_DATES = ['2026-06-20', '2026-06-25', '2026-07-15']; // Fechas de ejemplo
            if (BLOCKED_DATES.includes(formData.date)) {
                dateInput.classList.add('shake');
                setTimeout(() => dateInput.classList.remove('shake'), 500);
                isValid = false;
                alert("Lo sentimos, Mango & Nata tiene agenda llena para esta fecha. Por favor elige otra.");
            } else {
                isValid = !!formData.date;
            }
        }

        if (step === 4) {
            formData.location = document.getElementById('event-location').value;
            formData.venue = document.getElementById('event-venue').value;
            isValid = formData.location.length > 3;
        }

        if (step === 5) {
            formData.name = document.getElementById('contact-name').value;
            formData.wa = document.getElementById('contact-wa').value;
            isValid = formData.name.length > 2 && formData.wa.length > 7;
        }

        if (step === 6) isValid = true; 

        document.getElementById('btn-next').disabled = !isValid;
    };

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

        if (currentStep === 6) buildQuoteSummary();

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
    // PRICING ENGINE & SUMMARY
    // =============================================
    function calculatePrice() {
        if (!formData.paquete || !formData.base) return 0;
        return PRICING[formData.paquete][formData.base] || 0;
    }

    function buildQuoteSummary() {
        const total = calculatePrice();
        const summaryEl = document.getElementById('quote-summary');
        const totalEl = document.getElementById('quote-total');

        let html = `
            <div class="quote-row">
                <span>${formData.paquete} (${formData.base})</span>
                <strong>$${total.toLocaleString()}</strong>
            </div>
            <div class="quote-details">
                <p class="quote-detail-line"><i class="ri-heart-line"></i> Sabores: ${formData.sabores.join(', ')}</p>
                <p class="quote-detail-line"><i class="ri-calendar-line"></i> ${formData.date}</p>
                <p class="quote-detail-line"><i class="ri-map-pin-line"></i> ${formData.location}${formData.venue ? ' — ' + formData.venue : ''}</p>
                <p class="quote-detail-line"><i class="ri-group-line"></i> ${formData.event}</p>
            </div>
        `;

        summaryEl.innerHTML = html;
        totalEl.innerHTML = `<span>Estimado total</span><strong>$${total.toLocaleString()} MXN</strong>`;
    }

    function sendFinalInquiry() {
        const phone = '522292645358';
        const total = calculatePrice();

        let msg = "*COTIZACION MANGO & NATA*\n";
        msg += "------------------------\n\n";

        msg += `*Paquete Seleccionado:*\n`;
        msg += `> ${formData.paquete} (${formData.base}): $${total.toLocaleString()}\n\n`;

        msg += `*Sabores elegidos:*\n`;
        msg += `> ${formData.sabores.join(', ')}\n\n`;

        msg += "------------------------\n";
        msg += `*ESTIMADO TOTAL: $${total.toLocaleString()} MXN*\n`;
        msg += "------------------------\n\n";

        msg += `*Fecha:* ${formData.date}\n`;
        msg += `*Lugar:* ${formData.location}${formData.venue ? ' - ' + formData.venue : ''}\n`;
        msg += `*Evento:* ${formData.event}\n\n`;

        msg += `*Contacto:* ${formData.name}\n`;
        msg += `*WhatsApp:* ${formData.wa}\n\n`;

        msg += "¡Hola! Me gustaría confirmar la disponibilidad para este paquete. ¡Gracias!";

        const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(msg);
        window.open(url, '_blank');

        const defaults = { spread: 90, ticks: 100, gravity: 0.8, decay: 0.94, startVelocity: 30 };
        confetti({ ...defaults, particleCount: 50, scalar: 2, shapes: ['text'], shapeOptions: { text: { value: ['🥭','🍓','🍦','❄️'] } } });
        confetti({ ...defaults, particleCount: 50, colors: ['#FF5BBD', '#87B4E5'] });
    }

    // =============================================
    // DOWNLOAD QUOTE IMAGE
    // =============================================
    window.downloadQuote = () => {
        const node = document.getElementById('quote-wrapper-capture');
        const isDark = document.body.classList.contains('dark-mode');
        html2canvas(node, { backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA', scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Cotizacion-MangoNata.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };

    // =============================================
    // TILT EFFECT
    // =============================================
    VanillaTilt.init(document.querySelector('.brand-prof-unit'), { max: 8, speed: 400, glare: true, 'max-glare': 0.2 });
    VanillaTilt.init(document.querySelectorAll('.boho-card'), { max: 5, speed: 400, glare: true, 'max-glare': 0.1 });

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
