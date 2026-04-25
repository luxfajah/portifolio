document.addEventListener('DOMContentLoaded', () => {
    // ──────────────────────────────────────────────────
    // -1. LOADING SCREEN LOGIC
    // ──────────────────────────────────────────────────
    const loaderWrapper = document.getElementById('loader-wrapper');
    const loaderBar = document.getElementById('loader-bar');
    const loaderPercentage = document.getElementById('loader-percentage');

    // Sincronizar tema do loader IMEDIATAMENTE
    const savedMinimal = localStorage.getItem('vhs_minimal_mode');
    if (savedMinimal === 'false') {
        if (loaderWrapper) loaderWrapper.classList.add('vhs-loader');
        document.body.classList.remove('minimal-mode');
        // Sincronizar UI de botões se já existirem
        const vhsToggleInit = document.getElementById('vhs-toggle');
        if (vhsToggleInit) vhsToggleInit.setAttribute('title', 'Desligar Wallpaper');
        const toggleHintInit = document.querySelector('.toggle-hint .hint-text');
        if (toggleHintInit) toggleHintInit.textContent = 'Se o wallpaper estiver muito forte, você pode desativar aqui.';
    }
    const triggerLoader = (duration, callback) => {
        if (!loaderWrapper) return;
        
        let localProgress = 0;
        const localStartTime = Date.now();
        
        // Reset bar and text before showing
        if (loaderBar) loaderBar.style.width = '0%';
        if (loaderPercentage) {
            loaderPercentage.textContent = '0%';
            loaderPercentage.setAttribute('data-text', '0%');
        }

        loaderWrapper.classList.remove('fade-out');
        
        const update = () => {
            const timePassed = Date.now() - localStartTime;
            localProgress = Math.min((timePassed / duration) * 100, 100);
            
            if (loaderBar) loaderBar.style.width = `${localProgress}%`;
            if (loaderPercentage) {
                const pct = `${Math.floor(localProgress)}%`;
                loaderPercentage.textContent = pct;
                loaderPercentage.setAttribute('data-text', pct);
            }
            
            if (localProgress < 100) {
                requestAnimationFrame(update);
            } else {
                if (callback) callback();
                
                // Aguarda um pouco antes de sumir
                setTimeout(() => {
                    loaderWrapper.classList.add('fade-out');
                }, 400);
            }
        };
        
        requestAnimationFrame(update);
    };

    if (loaderWrapper) {
        // Carregamento inicial (espera o load do window se necessário)
        const initialDuration = 3000;
        const onInitialComplete = () => {
            if (document.readyState !== 'complete') {
                window.addEventListener('load', () => {
                    // Já completou os 100%, então só garante que sumiu
                }, { once: true });
            }
        };
        triggerLoader(initialDuration, onInitialComplete);
    }

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
        'transcender': {
            title: 'Transcender',
            subtitle: 'Identidade Visual · Grupo Terapêutico',
            content: [
                { type: 'img', src: 'images/projects/Transcender.png' },
                { type: 'text', title: 'Grupo Terapêutico Transcentrado', text: 'Desenvolvimento da identidade visual para o Transcender, um grupo terapêutico inovador idealizado pela premiada psicóloga Jussara Prado.' },
                { type: 'img', src: 'images/projects/Transcender-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=800' },
                { type: 'text', title: 'Foco na Comunidade', text: 'O projeto tem como núcleo o atendimento especializado para pessoas da comunidade LGBT+ e indivíduos neurodivergentes, garantindo um ambiente de total acolhimento.' },
                { type: 'img', src: 'images/projects/Transcender-3.png', fallback: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?q=80&w=800' },
                { type: 'text', title: 'Pioneirismo', text: 'O grupo faz parte da Clínica Autêntica, reconhecida como a primeira clínica totalmente transcentrada e com abordagem multidisciplinar do Brasil.' },
                { type: 'full-img', src: 'images/projects/Transcender-full.png', fallback: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=1600' }
            ]
        },
        'djdope': {
            title: 'DJ Dope',
            subtitle: 'Identidade Visual · Música Eletrônica',
            content: [
                { type: 'img', src: 'images/projects/Dope.png' },
                { type: 'text', title: 'A Essência de Ouro Preto', text: 'Identidade visual para o DJ Dope, músico mineiro com raízes fortes na cena eletrônica e no funk, diretamente de Ouro Preto.' },
                { type: 'img', src: 'images/projects/Dope-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800' },
                { type: 'text', title: 'Estética Dope', text: 'A estética visual acompanha o estilo musical único, mesclando a crueza urbana, ruídos visuais com a energia crua das pistas de dança.' },
                { type: 'img', src: 'images/projects/Dope-3.png', fallback: 'https://images.unsplash.com/photo-1470229722913-7c090be5c5a8?q=80&w=800' },
                { type: 'text', title: 'Identidade e Pôsteres', text: 'O projeto inclui pôsteres promocionais, tipografia agressiva e layouts que capturam a essência vibrante de seus sets.' },
                { type: 'full-img', src: 'images/projects/Dope-full.png', fallback: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1600' }
            ]
        },
        'dragabriela': {
            title: 'Dra. Gabriela Saueressig',
            subtitle: 'Marca Pessoal · Medicina',
            content: [
                { type: 'img', src: 'images/projects/Dra. Gabriela.png' },
                { type: 'text', title: 'Marca Pessoal', text: 'Identidade visual criada para a Dra. Gabriela Saueressig, médica cirurgiã e ginecologista de alta performance.' },
                { type: 'img', src: 'images/projects/Dra. Gabriela-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800' },
                { type: 'text', title: 'Ética e Técnica', text: 'A identidade equilibra perfeitamente a empatia humana no trato com as pacientes e a precisão cirúrgica impecável que a profissão exige.' },
                { type: 'img', src: 'images/projects/Dra. Gabriela-3.png', fallback: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800' },
                { type: 'text', title: 'Você fala, o corpo responde', text: 'O resultado é uma comunicação ética, limpa e sofisticada, focada em transmitir confiança absoluta desde a primeira consulta.' },
                { type: 'full-img', src: 'images/projects/Dra. Gabriela-full.png', fallback: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1600' }
            ]
        },
        'mixgrafica': {
            title: 'Mix Gráfica',
            subtitle: 'Identidade Visual · Rede de Gráficas',
            content: [
                { type: 'img', src: 'images/projects/Mix.png' },
                { type: 'text', title: 'Expansão no Nordeste', text: 'Mix Tecnologia e Gráfica atua como uma gigantesca rede de gráficas express distribuídas estrategicamente pelo nordeste do Brasil.' },
                { type: 'img', src: 'images/projects/Mix-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800' },
                { type: 'text', title: 'Velocidade e Solidez', text: 'A identidade precisava comunicar velocidade absurda de entrega e confiança estrutural, pilares de uma operação de alta demanda.' },
                { type: 'img', src: 'images/projects/Mix-3.png', fallback: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=800' },
                { type: 'text', title: 'Impacto Visual', text: 'A marca utiliza contrastes fortes, variando do brutalismo em preto e branco ao espectro RGB puro, simbolizando impressão física e digital.' },
                { type: 'full-img', src: 'images/projects/Mix-full.png', fallback: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600' }
            ]
        },
        'virtubarbearia': {
            title: 'Virtu Barbearia',
            subtitle: 'Branding · Barbearia',
            content: [
                { type: 'img', src: 'images/projects/virtu.png' },
                { type: 'text', title: 'Pilares Cristãos', text: 'Virtu é muito mais que uma barbearia. É um espaço com fundamentação cristã, onde os pilares inegociáveis são a família, a tradição e Deus.' },
                { type: 'img', src: 'images/projects/virtu-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800' },
                { type: 'text', title: 'Resgate Clássico', text: 'O ambiente e a identidade visual resgatam os valores clássicos do ofício, criando um espaço seguro, de profundo respeito e fortalecimento da comunidade.' },
                { type: 'img', src: 'images/projects/virtu-3.png', fallback: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800' },
                { type: 'text', title: 'Herança Visual', text: 'A comunicação utiliza tons sóbrios, materiais nobres e uma tipografia pesada e marcante para honrar a herança e os princípios inabaláveis do negócio.' },
                { type: 'full-img', src: 'images/projects/virtu-full.png', fallback: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=1600' }
            ]
        },
        'gabrielly': {
            title: 'Gabrielly Lima Psico',
            subtitle: 'Identidade Visual · Psicologia',
            content: [
                { type: 'img', src: 'images/projects/Gabrielly.png' },
                { type: 'text', title: 'Atendimento Inclusivo', text: 'Identidade visual para Gabrielly Lima, psicóloga especializada no atendimento de pessoas da comunidade LGBT+ e indivíduos neurodivergentes.' },
                { type: 'img', src: 'images/projects/Gabrielly-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800' },
                { type: 'text', title: 'Fugindo do Clínico', text: 'O projeto quebra intencionalmente a estética fria das clínicas tradicionais, utilizando cores empáticas e ilustrações para gerar conforto.' },
                { type: 'img', src: 'images/projects/Gabrielly-3.png', fallback: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800' },
                { type: 'text', title: 'Relações Livres', text: 'Especializada em relações não-convencionais, a comunicação reflete abertura total, escuta ativa e um ambiente livre de amarras morais e julgamentos.' },
                { type: 'full-img', src: 'images/projects/Gabrielly-full.png', fallback: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=1600' }
            ]
        },
        'lena': {
            title: 'Lena Biojoias',
            subtitle: 'Branding · Biojoias Artesanais',
            content: [
                { type: 'img', src: 'images/projects/lena.png' },
                { type: 'text', title: 'Produção Manual', text: 'Lena é uma marca de biojoias exclusivas de fabricação 100% manual, que exalta o trabalho artesanal e o design sustentável de alto luxo.' },
                { type: 'img', src: 'images/projects/lena-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=800' },
                { type: 'text', title: 'Matéria-Prima Mineira', text: 'A base das peças envolve resina cristalina unida a matérias-primas cruas de Minas Gerais, como fragmentos de madeira, minério de ferro e rochas raras.' },
                { type: 'img', src: 'images/projects/lena-3.png', fallback: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800' },
                { type: 'text', title: 'O Tecnológico e o Orgânico', text: 'O grande diferencial da marca está na fusão poética de lixo eletrônico descartado com a natureza intocada, criando uma estética retrofuturista.' },
                { type: 'full-img', src: 'images/projects/lena-full.png', fallback: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1600' }
            ]
        },
        'lavapis': {
            title: 'Lavapis',
            subtitle: 'Identidade Visual · Plataforma de Serviços',
            content: [
                { type: 'img', src: 'images/projects/lavapis.png' },
                { type: 'text', title: 'Lavanderia por Assinatura', text: 'Lavapis é uma plataforma digital e inovadora de lavanderia por assinatura operando com serviços de delivery focados na cidade de Foz do Iguaçu.' },
                { type: 'img', src: 'images/projects/lavapis-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800' },
                { type: 'text', title: 'Roupas Limpas, Vida Leve', text: 'O projeto gráfico foi desenvolvido para transmitir agilidade e tirar o peso da rotina doméstica. O slogan guia todo o direcionamento da marca.' },
                { type: 'img', src: 'images/projects/lavapis-3.png', fallback: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800' },
                { type: 'text', title: 'Design Fluido', text: 'Identidade fresca, utilizando tons de azul e gradientes fluidos para gerar a sensação imediata de limpeza, eficiência e praticidade.' },
                { type: 'full-img', src: 'images/projects/lavapis-full.png', fallback: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=1600' }
            ]
        },
        'respeita': {
            title: 'Respeita Meu Nome',
            subtitle: 'Direção de Arte · Direitos LGBT+',
            content: [
                { type: 'img', src: 'images/projects/Respeita meu nome.png' },
                { type: 'text', title: 'Plataforma de Direitos', text: 'Respeita Meu Nome atua como uma plataforma centralizada de defesa de direitos humanos, suporte jurídico e mobilização focada na população LGBT+.' },
                { type: 'img', src: 'images/projects/respeita-2.png', reverse: true, fallback: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800' },
                { type: 'text', title: 'Urgência e Empoderamento', text: 'Desenvolvimento de uma identidade visual contundente, que grita urgência e exige respeito através de formas robustas e diretas.' },
                { type: 'img', src: 'images/projects/respeita-3.png', fallback: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800' },
                { type: 'text', title: 'Ninguém Apaga Quem Você É', text: 'A direção de arte atua como uma armadura visual, usando cores vibrantes e layouts impactantes para blindar e empoderar identidades marginalizadas.' },
                { type: 'full-img', src: 'images/projects/respeita-full.png', fallback: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=1600' }
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

        // Bloco de título centralizado no topo do projeto
        const heroBlock = document.createElement('div');
        heroBlock.className = 'pv-hero-title';
        heroBlock.innerHTML = `<h1>${data.title}</h1><p>${data.subtitle || ''}</p>`;
        pvContent.appendChild(heroBlock);

        data.content.forEach(item => {
            if (item.type === 'full-img') {
                const fullRow = document.createElement('div');
                fullRow.className = 'pv-full-img';
                // Usando onerror fallback logic for placeholders se imagem não existir
                const imgSrc = item.src;
                const fallbackStr = item.fallback ? `onerror="this.src='${item.fallback}'"` : "";
                fullRow.innerHTML = `<img src="${imgSrc}" ${fallbackStr} alt="Projeto Completo">`;
                pvContent.appendChild(fullRow);
            } else if (item.type === 'img') {
                const row = document.createElement('div');
                row.className = `pv-row ${item.reverse ? 'reverse' : ''}`;
                const fallbackStr = item.fallback ? `onerror="this.src='${item.fallback}'"` : "";
                row.innerHTML = `<div class="pv-img-wrap"><img src="${item.src}" ${fallbackStr} alt="projeto"></div><div></div>`;
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

        // Trocar "luxfajah.com" do header principal para botão de voltar
        const playLink = document.querySelector('.intro-wrap .play');
        if (playLink) {
            playLink._originalText = playLink.textContent;
            playLink._originalHref = playLink.getAttribute('href');
            playLink.textContent = '← voltar';
            playLink.setAttribute('href', '#');
            playLink.onclick = (e) => { e.preventDefault(); closeProject(); };
        }
    };

    window.closeProject = () => {
        const pvViewer = document.getElementById('projectViewer');
        pvViewer.classList.remove('open');
        document.body.style.overflow = '';

        // Restaurar "luxfajah.com" no header principal
        const playLink = document.querySelector('.intro-wrap .play');
        if (playLink && playLink._originalText) {
            playLink.textContent = playLink._originalText;
            playLink.setAttribute('href', playLink._originalHref || '#');
            playLink.onclick = null;
        }
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
            // Sincronizar o tema do loader IMEDIATAMENTE ao clicar para a transição ser correta
            // Se estamos no minimal, vamos para o VHS, então o loader deve ser VHS
            if (document.body.classList.contains('minimal-mode')) {
                loaderWrapper.classList.add('vhs-loader');
            } else {
                loaderWrapper.classList.remove('vhs-loader');
            }

            // Duração menor para troca de tema (1.2s)
            triggerLoader(1200, () => {
                document.body.classList.toggle('minimal-mode');
                
                // Garantir sincronia final (redundante mas seguro)
                if (document.body.classList.contains('minimal-mode')) {
                    loaderWrapper.classList.remove('vhs-loader');
                } else {
                    loaderWrapper.classList.add('vhs-loader');
                }

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
        });
    }

    // ──────────────────────────────────────────────────
    // 8.5 VIDEO SPEED LOGIC (2x Speed)
    // ──────────────────────────────────────────────────
    const manualVideo = document.getElementById('manual-video');
    if (manualVideo) {
        manualVideo.playbackRate = 2.0;
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
