document.addEventListener('DOMContentLoaded', () => {
    // Initialize Splitting for VHS text effects
    if (typeof Splitting === 'function') {
        Splitting();
    }

    // ── Referências ──
    const ambientProfile  = document.getElementById('ambient-profile');
    const cursor          = document.getElementById('custom-cursor');
    const cursorDot       = document.getElementById('cursor-dot');
    const parallaxElements = document.querySelectorAll('.parallax');
    const draggableElements = document.querySelectorAll('.scatter-thumb, .collage-card');
    const modal           = document.getElementById('image-modal');
    const modalImg        = document.getElementById('modal-image');
    const closeBtn        = document.querySelector('.modal-close');

    // ──────────────────────────────────────────────────
    // 0. PREPARAÇÃO DA MÁQUINA DE ESCREVER
    // ──────────────────────────────────────────────────
    const introSection = document.querySelector('.intro-section');
    const introTextEl = document.querySelector('.intro-text');
    
    // Função para separar o texto em spans, letra por letra
    const wrapCharacters = (element) => {
        const nodes = Array.from(element.childNodes);
        nodes.forEach(node => {
            if (node.nodeType === 3) { // Nó de texto
                const text = node.nodeValue;
                // Não wrapa textos que são só espaços para não criar spans inúteis,
                // mas preserva o espaço visualmente mantendo o próprio nó de texto
                if (text.trim() !== '') {
                    const fragment = document.createDocumentFragment();
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        if (char === ' ') {
                            // Espaços ficam normais
                            fragment.appendChild(document.createTextNode(' '));
                        } else {
                            const span = document.createElement('span');
                            span.className = 'typewriter-char';
                            span.style.opacity = '0'; // Começa 100% invisível
                            span.textContent = char;
                            fragment.appendChild(span);
                        }
                    }
                    element.replaceChild(fragment, node);
                }
            } else if (node.nodeType === 1) { // Elemento normal (ex: span.blur-highlight)
                wrapCharacters(node);
            }
        });
    };

    if (introTextEl) {
        wrapCharacters(introTextEl);
    }
    const typewriterChars = document.querySelectorAll('.typewriter-char');
    const totalChars = typewriterChars.length;
    let currentRevealCount = -1;

    // ──────────────────────────────────────────────────
    // 1. CURSOR PERSONALIZADO
    // ──────────────────────────────────────────────────
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    window.addEventListener('mousedown', () => cursor && cursor.classList.add('clicking'));
    window.addEventListener('mouseup',   () => cursor && cursor.classList.remove('clicking'));

    // ──────────────────────────────────────────────────
    // 2. ESTADO DE SCROLL / PARALLAX / DRAG
    // ──────────────────────────────────────────────────
    let currentScroll = 0;
    let targetScroll  = 0;
    const scrollEase  = 0.08;
    const cursorEase  = 0.14;

    // Drag offsets per element
    const dragOffsets = new Map();
    parallaxElements.forEach(el => dragOffsets.set(el, { x: 0, y: 0 }));

    // Drag state
    let activeDragElement = null;
    let startMouseX = 0;
    let startMouseY = 0;
    let initialDragX = 0;
    let initialDragY = 0;
    let isDragging = false;

    // ──────────────────────────────────────────────────
    // 3. LOOP ÚNICO DE ANIMAÇÃO
    // ──────────────────────────────────────────────────
    const tick = () => {
        // — Cursor suave —
        if (cursor) {
            cursorX += (mouseX - cursorX) * cursorEase;
            cursorY += (mouseY - cursorY) * cursorEase;
            cursor.style.transform = `translate(${cursorX - 2}px, ${cursorY - 2}px)`;
        }

        // — Scroll suave —
        targetScroll = window.scrollY;
        if (Math.abs(targetScroll - currentScroll) > 0.1) {
            currentScroll += (targetScroll - currentScroll) * scrollEase;
        } else {
            currentScroll = targetScroll;
        }

        // — GIF Ambiente: blur progressivo baseado no progresso total da página —
        if (ambientProfile) {
            const totalScrollable = Math.max(1, document.body.scrollHeight - window.innerHeight);
            const progress = currentScroll / totalScrollable;

            ambientProfile.style.transform = `scale(${1 + progress * 1.2})`;
            ambientProfile.style.filter    = `blur(${progress * 30}px)`; // Max 30px so it only looks "100% blurred" at the very end
            ambientProfile.style.opacity   = Math.max(1 - progress * 0.7, 0.2);
        }

        // — Parallax de todos os elementos —
        parallaxElements.forEach(el => {
            const speed  = parseFloat(el.getAttribute('data-speed')) || 0.1;
            const rot    = el.getAttribute('data-rotate') || '0';
            const drag   = dragOffsets.get(el) || { x: 0, y: 0 };
            const yShift = -currentScroll * speed;

            el.style.transform = `translate(${drag.x}px, ${yShift + drag.y}px) rotate(${rot}deg)`;
        });

        // — Efeito Máquina de Escrever na Intro —
        if (introSection && totalChars > 0) {
            const textRect = introTextEl.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            
            // O efeito começa quando o topo do texto chega a 85% da tela (entrando)
            const triggerStart = windowHeight * 0.85; 
            // O efeito termina quando o final do texto chega a 20% da tela (quase saindo)
            const triggerEnd = windowHeight * 0.2; 
            
            // Distância total que o topo do texto precisa percorrer para que o fim dele chegue no triggerEnd
            const totalDistance = triggerStart - (triggerEnd - textRect.height);
            
            let typeProgress = 0;
            if (textRect.top < triggerStart) {
                typeProgress = (triggerStart - textRect.top) / totalDistance;
            }
            typeProgress = Math.max(0, Math.min(1, typeProgress));

            const targetRevealCount = Math.floor(typeProgress * totalChars);
            
            if (targetRevealCount !== currentRevealCount) {
                for (let i = 0; i < totalChars; i++) {
                    typewriterChars[i].style.opacity = i < targetRevealCount ? '1' : '0';
                }
                
                let cursorEl = document.getElementById('typing-cursor');
                if (!cursorEl) {
                    cursorEl = document.createElement('span');
                    cursorEl.id = 'typing-cursor';
                    cursorEl.textContent = '|';
                }

                if (targetRevealCount > 0 && targetRevealCount <= totalChars) {
                    const targetChar = typewriterChars[targetRevealCount - 1];
                    targetChar.parentNode.insertBefore(cursorEl, targetChar.nextSibling);
                } else if (targetRevealCount === 0 && totalChars > 0) {
                    const firstChar = typewriterChars[0];
                    firstChar.parentNode.insertBefore(cursorEl, firstChar);
                }

                currentRevealCount = targetRevealCount;
            }
        }

        requestAnimationFrame(tick);
    };

    tick(); // Inicia o loop

    // ──────────────────────────────────────────────────
    // 4. DRAG AND DROP
    // ──────────────────────────────────────────────────
    const startDrag = (el, clientX, clientY) => {
        activeDragElement = el;
        isDragging = false;
        startMouseX = clientX;
        startMouseY = clientY;

        const offset = dragOffsets.get(el);
        initialDragX = offset ? offset.x : 0;
        initialDragY = offset ? offset.y : 0;

        el.style.zIndex = '1000';
    };

    draggableElements.forEach(el => {
        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            startDrag(el, e.clientX, e.clientY);
        });
        el.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startDrag(el, touch.clientX, touch.clientY);
        }, { passive: true });
    });

    const moveDrag = (clientX, clientY, e) => {
        if (!activeDragElement) return;

        const dx = clientX - startMouseX;
        const dy = clientY - startMouseY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging = true;

        // Se for touch e começou a arrastar (movimento maior que 4px), previne o scroll
        if (isDragging && e && e.type === 'touchmove') {
            if (e.cancelable) e.preventDefault();
        }

        const offset = dragOffsets.get(activeDragElement);
        if (offset) {
            offset.x = initialDragX + dx;
            offset.y = initialDragY + dy;
        }

        document.body.style.userSelect = 'none';
    };

    window.addEventListener('mousemove', (e) => {
        moveDrag(e.clientX, e.clientY, e);
    });

    window.addEventListener('touchmove', (e) => {
        if (!activeDragElement) return;
        const touch = e.touches[0];
        moveDrag(touch.clientX, touch.clientY, e);
    }, { passive: false });

    const endDrag = () => {
        if (!activeDragElement) return;
        activeDragElement.style.zIndex = '';
        activeDragElement = null;
        document.body.style.userSelect = '';
        setTimeout(() => { isDragging = false; }, 0);
    };

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    // ──────────────────────────────────────────────────
    // 5. PROJECT VIEWER LOGIC
    // ──────────────────────────────────────────────────
    const projectData = {
        'rebeldia': {
            title: 'Rebeldia Visual',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=800' },
                { type: 'text', title: 'A quebra do padrão', text: 'Este projeto explora a desconstrução de grades rígidas em favor de um sistema fluido e imprevisível. Não buscamos a perfeição, mas a expressão bruta da marca.' },
                { type: 'img', src: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800', reverse: true },
                { type: 'text', title: 'O caos intencional', text: 'Cada distorção é planejada para atrair o olhar e desafiar a neutralidade corporativa padrão.' }
            ]
        },
        'estrutura': {
            title: 'Estrutura & Caos',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=800' },
                { type: 'text', title: 'Fundação sólida', text: 'Um sistema de design que suporta o crescimento sem perder sua essência experimental. Estrutura não precisa ser chata.' }
            ]
        },
        'elevacao': {
            title: 'Elevação de Marca',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800' },
                { type: 'text', title: 'Novo Patamar', text: 'Identidades que elevam o valor percebido através de escolhas tipográficas ousadas e paletas de cores magnéticas.' }
            ]
        },
        'distorcao': {
            title: 'Distorção Estratégica',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800' },
                { type: 'text', title: 'Realidade Expandida', text: 'Distorcer para revelar. Este projeto usa técnicas de manipulação visual para criar profundidade onde antes havia apenas superfície.' }
            ]
        },
        'simetria': {
            title: 'Simetria Quebrada',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800' },
                { type: 'text', title: 'Equilíbrio Dinâmico', text: 'O uso da simetria como base para criar tensões visuais interessantes e composições que parecem vivas.' }
            ]
        },
        'fragmento': {
            title: 'Fragmento de Identidade',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800' },
                { type: 'text', title: 'Partes do Todo', text: 'Identidades visuais que funcionam mesmo quando fragmentadas. Cada detalhe carrega o DNA da marca.' }
            ]
        },
        'tensao': {
            title: 'Tensão Gráfica',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=800' },
                { type: 'text', title: 'O Limite da Forma', text: 'Explorando quanto uma forma pode ser esticada antes de perder seu significado original.' }
            ]
        },
        'colapso': {
            title: 'Colapso de Forma',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800' },
                { type: 'text', title: 'Beleza no Erro', text: 'Transformando falhas técnicas em ativos estéticos. O erro como ferramenta criativa intencional.' }
            ]
        },
        'origem': {
            title: 'Origem de Marca',
            content: [
                { type: 'img', src: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800' },
                { type: 'text', title: 'DNA Criativo', text: 'Voltando às bases para construir algo inteiramente novo. Minimalismo com propósito e alma.' }
            ]
        }
    };

    window.openProject = (key) => {
        const data = projectData[key];
        if (!data) return;

        const pvTitle = document.getElementById('pvTitle');
        const pvContent = document.getElementById('pvContent');
        const pvViewer = document.getElementById('projectViewer');

        pvTitle.textContent = data.title;
        pvContent.innerHTML = '';

        data.content.forEach(item => {
            if (item.type === 'img') {
                const row = document.createElement('div');
                row.className = `pv-row ${item.reverse ? 'reverse' : ''}`;
                row.innerHTML = `<div class="pv-img-wrap"><img src="${item.src}" alt="projeto"></div><div></div>`;
                pvContent.appendChild(row);
            } else if (item.type === 'text') {
                const row = document.createElement('div');
                row.className = 'pv-row';
                // Find previous image row to attach text or create a new one
                const lastRow = pvContent.lastElementChild;
                if (lastRow && lastRow.classList.contains('pv-row')) {
                    const textCol = lastRow.querySelector('div:last-child');
                    textCol.innerHTML = `<div class="pv-text"><h3>${item.title}</h3><p>${item.text}</p></div>`;
                } else {
                    row.innerHTML = `<div></div><div class="pv-text"><h3>${item.title}</h3><p>${item.text}</p></div>`;
                    pvContent.appendChild(row);
                }
            }
        });

        pvViewer.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.closeProject = () => {
        const pvViewer = document.getElementById('projectViewer');
        pvViewer.classList.remove('open');
        document.body.style.overflow = '';
    };

    // ──────────────────────────────────────────────────
    // 6. CLICK HANDLERS
    // ──────────────────────────────────────────────────
    draggableElements.forEach(card => {
        card.addEventListener('click', (e) => {
            if (isDragging) { e.preventDefault(); return; }
            
            // Se for um scatter-thumb, abre o projeto
            const projectKey = card.getAttribute('data-project');
            if (projectKey) {
                openProject(projectKey);
            } else {
                // Caso contrário (collage-card), usa o modal antigo
                modalImg.src = card.src;
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { modalImg.src = ''; }, 400);
    };

    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal && modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // ──────────────────────────────────────────────────
    // 7. GLITCH EFFECT INITIALIZATION
    // ──────────────────────────────────────────────────
    const heroGlitch = document.querySelector('.hero-title.glitch');
    if (heroGlitch) {
        // Start with is-off for a more dramatic entrance if desired
        heroGlitch.classList.add('is-off');
        
        setTimeout(() => {
            heroGlitch.classList.remove('is-off');
        }, 2000);
    }
    // ──────────────────────────────────────────────────
    // 8. VHS WALLPAPER TOGGLE (CLEAN MODE)
    // ──────────────────────────────────────────────────
    const vhsToggle = document.getElementById('vhs-toggle');
    if (vhsToggle) {
        vhsToggle.addEventListener('click', () => {
            document.body.classList.toggle('minimal-mode');
            
            // Update title based on state
            if (document.body.classList.contains('minimal-mode')) {
                vhsToggle.setAttribute('title', 'Ligar Wallpaper');
            } else {
                vhsToggle.setAttribute('title', 'Desligar Wallpaper');
            }

            // Atualizar texto da dica do botão
            const toggleHintText = document.querySelector('.toggle-hint .hint-text');
            if (toggleHintText) {
                if (document.body.classList.contains('minimal-mode')) {
                    toggleHintText.textContent = 'Ative para ver o caos.';
                    localStorage.setItem('vhs_minimal_mode', 'true');
                } else {
                    toggleHintText.textContent = 'Se o wallpaper estiver muito forte, você pode desativar aqui.';
                    localStorage.setItem('vhs_minimal_mode', 'false');
                }
            }
        });
    }

    // Inicializar estado salvo
    if (localStorage.getItem('vhs_minimal_mode') === 'false') {
        document.body.classList.remove('minimal-mode');
        const vhsToggle = document.getElementById('vhs-toggle');
        if (vhsToggle) vhsToggle.setAttribute('title', 'Desligar Wallpaper');
        const toggleHintText = document.querySelector('.toggle-hint .hint-text');
        if (toggleHintText) toggleHintText.textContent = 'Se o wallpaper estiver muito forte, você pode desativar aqui.';
    }
    // 9. MOBILE SCROLL DETECTION
    // ──────────────────────────────────────────────────
    window.addEventListener('scroll', () => {
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            const heroHeight = heroSection.offsetHeight;
            if (window.scrollY > heroHeight - 100) {
                document.body.classList.add('scrolled-past-header');
            } else {
                document.body.classList.remove('scrolled-past-header');
            }
        }
    });

    // ──────────────────────────────────────────────────
    // 10. VISITOR COUNTER LOGIC (Simulated)
    // ──────────────────────────────────────────────────
    const counterEl = document.querySelector('.visitor-counter');
    if (counterEl) {
        let visits = localStorage.getItem('vhs_visits') || 0;
        visits = parseInt(visits) + 1;
        localStorage.setItem('vhs_visits', visits);
        
        // Formatar para 8 dígitos (0000000X)
        const formatted = String(visits).padStart(8, '0');
        counterEl.textContent = formatted;
    }
});
