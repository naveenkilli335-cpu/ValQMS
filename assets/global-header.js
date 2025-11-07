// ValQMS Global Header
// Injects a consistent, modern header across application pages
// - Home button (green)
// - Back button (white)
// - PDF button (white) that triggers page-provided export or falls back to print

(function () {
	const ready = (fn) => {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			setTimeout(fn, 0);
		} else {
			document.addEventListener('DOMContentLoaded', fn);
		}
	};

	ready(() => {
		// Enforce mint background across pages to match index
		try {
			document.documentElement.setAttribute('data-bg', 'mint');
		} catch (e) {}
		// Avoid duplicate insert
		if (document.querySelector('header.vq-global-header')) return;

		// Minimal scoped styles for the header so it works on any page
		const style = document.createElement('style');
		style.setAttribute('data-vq-global-header', '');
		style.textContent = `
			.vq-global-header { position: fixed; top: 12px; left: 0; right: 0; z-index: 1000; padding: 0 24px; }
			.vq-global-header .header-glass { background: #0f172a; color: #fff; backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 0 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06); }
			.vq-global-header .container { display: flex; justify-content: space-between; align-items: center; height: 72px; max-width: 100%; margin: 0 auto; }
			.vq-global-header .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; }
			.vq-global-header .logo-mark { display:flex; align-items:center; justify-content:center; width:48px; height:48px; background: linear-gradient(135deg, var(--accent, #10b981), var(--accent-bright, #34d399)); border-radius: 12px; box-shadow: 0 4px 20px rgba(16,185,129,0.35); }
			.vq-global-header .brand-initials { font-weight: 900; font-size: 18px; color:#fff; text-shadow: 0 1px 2px rgba(0,0,0,0.25); }
			.vq-global-header .brand-title { display:flex; flex-direction:column; line-height: 1.2; }
			.vq-global-header .brand-title .main { color:#fff; font-weight:800; font-size: 20px; }
			.vq-global-header .brand-title .sub { color: rgba(255,255,255,0.8); font-weight:600; font-size: 13px; }
			.vq-global-header .controls { display:flex; gap: 12px; align-items: center; }
			.vq-global-header .btn { padding: 10px 16px; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s ease; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
			.vq-global-header .btn-green { background: linear-gradient(135deg, var(--accent, #10b981), var(--accent-bright, #34d399)); color: #000; box-shadow: 0 6px 18px rgba(16,185,129,0.35); border: 1px solid rgba(255,255,255,0.12); }
			.vq-global-header .btn-green:hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(16,185,129,0.45); }
			.vq-global-header .btn-white { background:#fff; color:#0f172a; border:1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(15,23,42,0.06), 0 1px 1px rgba(15,23,42,0.03); }
			.vq-global-header .btn-white:hover { transform: translateY(-1px); border-color: var(--accent, #10b981); box-shadow: 0 6px 18px rgba(16,185,129,0.15); }
			/* Offset page content for fixed header (account for top spacing + header height + visual gap) */
			/* Desktop: 72px header + 12px offset + 24px gap = 108px */
			body { padding-top: 108px !important; }
			@media (max-width: 768px){ 
				.vq-global-header { top: 8px; padding: 0 12px; }
				.vq-global-header .container { height: 56px; }
				.vq-global-header .brand-title .sub { display:none; }
				/* Mobile: 56px header + 8px offset + 24px gap = 88px */
				body { padding-top: 88px !important; }
			}
		`;
		document.head.appendChild(style);

		// Inject shared modal theming for mint/light background: dark header + light body
		if (!document.querySelector('style[data-vq-modal-theme]')) {
			const modalStyle = document.createElement('style');
			modalStyle.setAttribute('data-vq-modal-theme', '');
			modalStyle.textContent = `
				/* Consistent modal theming when using the light/mint background */
				[data-bg="mint"] .modal-content { background: rgba(255,255,255,0.95); border: 1px solid rgba(16,185,129,0.2); border-radius: 20px; box-shadow: 0 20px 40px rgba(15,23,42,0.15); overflow: hidden; }
				[data-bg="mint"] .modal-header { background: #0f172a; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1) !important; padding: 20px 24px !important; margin: 0 !important; }
				[data-bg="mint"] .modal-header .modal-title,
				[data-bg="mint"] .modal-header h2 { color: #ffffff !important; font-size: 22px !important; font-weight: 800 !important; letter-spacing: -0.2px; }
				[data-bg="mint"] .modal-body, [data-bg="mint"] .modal-footer { background: #ffffff; color: #1e293b; padding: 24px !important; }
				[data-bg="mint"] .close-modal, [data-bg="mint"] .close-btn { color: #ffffff !important; width: 32px; height: 32px; border-radius: 8px; }
				[data-bg="mint"] .close-modal:hover, [data-bg="mint"] .close-btn:hover { background: rgba(255,255,255,0.08); }
			`;
			document.head.appendChild(modalStyle);
		}

		const hdr = document.createElement('header');
		hdr.className = 'vq-global-header';

		const subtitle = (() => {
			const t = (document.title || '').split('|')[0].trim();
			return t && t !== 'ValQMS' ? t : (document.body?.getAttribute('data-page-subtitle') || '');
		})();

		hdr.innerHTML = `
			<div class="header-glass">
				<div class="container">
					<a href="index.html" class="logo" aria-label="ValQMS Home">
						<div class="logo-mark"><span class="brand-initials">VQ</span></div>
						<div class="brand-title">
							<span class="main">ValQMS Applications</span>
							${subtitle ? `<span class="sub">${subtitle}</span>` : ''}
						</div>
					</a>
					<div class="controls">
						<button type="button" class="btn btn-white" id="vqBackBtn" title="Go Back">← Back</button>
						<button type="button" class="btn btn-white" id="vqPdfBtn" title="Download PDF">⬇ PDF</button>
						<a href="index.html" class="btn btn-green" id="vqHomeBtn" title="Home">Home</a>
					</div>
				</div>
			</div>
		`;

		// Insert as the first child of body
		document.body.insertBefore(hdr, document.body.firstChild);

		// Wire up Back button
		const backBtn = hdr.querySelector('#vqBackBtn');
		if (backBtn) {
			backBtn.addEventListener('click', () => {
				try {
					const ref = document.referrer || '';
					const sameOrigin = ref && ref.startsWith(location.origin);
					if (sameOrigin && history.length > 1) history.back();
					else window.location.href = 'index.html';
				} catch (e) {
					window.location.href = 'index.html';
				}
			});
		}

		// Wire up PDF button; prefer app-provided export handlers
		const pdfBtn = hdr.querySelector('#vqPdfBtn');
		const hasPdf = () => {
			return (
				typeof window.exportToPDF === 'function' ||
				typeof window.generatePDF === 'function' ||
				typeof window.downloadPDF === 'function' ||
				document.querySelector('[data-pdf], #downloadPDF, .download-pdf')
			);
		};
		if (pdfBtn) {
			if (!hasPdf()) {
				// No explicit PDF capability detected: keep a print fallback
				pdfBtn.addEventListener('click', () => window.print());
			} else {
				pdfBtn.addEventListener('click', () => {
					if (typeof window.exportToPDF === 'function') return window.exportToPDF();
					if (typeof window.generatePDF === 'function') return window.generatePDF();
					if (typeof window.downloadPDF === 'function') return window.downloadPDF();
					const el = document.querySelector('#downloadPDF, .download-pdf, [data-pdf]');
					if (el) {
						el.dispatchEvent(new Event('click'));
						return;
					}
					// Fallback
					window.print();
				});
			}
		}
	});
})();

