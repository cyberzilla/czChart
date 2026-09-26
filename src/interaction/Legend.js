'use strict';

(function(CZ) {
    /**
     * Interactive legend component with hover highlight support.
     */
    class Legend {
        constructor(legendContainer, chart, options = {}) {
            this.container = legendContainer;
            this.chart = chart;
            this.options = options;
            this.items = [];
            
            this.container.classList.add('cz-legend');

            this._onClick = this._onClick.bind(this);
            this._onMouseOver = this._onMouseOver.bind(this);
            this._onMouseOut = this._onMouseOut.bind(this);

            this.container.addEventListener('click', this._onClick);
            this.container.addEventListener('mouseover', this._onMouseOver);
            this.container.addEventListener('mouseout', this._onMouseOut);
        }

        render(items) {
            this.items = items;
            this.container.innerHTML = '';

            items.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'cz-legend-item';
                if (item.visible === false) {
                    div.classList.add('cz-legend-disabled');
                }
                div.setAttribute('data-index', item.datasetIndex !== undefined ? item.datasetIndex : index);

                const swatch = document.createElement('span');
                swatch.className = 'cz-legend-swatch';
                swatch.style.backgroundColor = item.color;

                const label = document.createElement('span');
                label.className = 'cz-legend-label';
                label.textContent = item.name;

                div.appendChild(swatch);
                div.appendChild(label);
                this.container.appendChild(div);
            });
        }

        update(items) {
            this.items = items;
            const children = this.container.children;
            
            items.forEach((item, index) => {
                const datasetIndex = item.datasetIndex !== undefined ? item.datasetIndex : index;
                let el = null;
                for (let i = 0; i < children.length; i++) {
                    if (parseInt(children[i].getAttribute('data-index'), 10) === datasetIndex) {
                        el = children[i];
                        break;
                    }
                }
                if (el) {
                    if (item.visible === false) {
                        el.classList.add('cz-legend-disabled');
                    } else {
                        el.classList.remove('cz-legend-disabled');
                    }
                }
            });
        }

        _onClick(e) {
            const itemEl = e.target.closest('.cz-legend-item');
            if (!itemEl) return;
            const index = parseInt(itemEl.getAttribute('data-index'), 10);
            if (isNaN(index)) return;

            // Bounce animation on swatch
            const swatch = itemEl.querySelector('.cz-legend-swatch');
            if (swatch) {
                swatch.classList.remove('cz-bounce');
                // Force reflow to restart animation
                void swatch.offsetWidth;
                swatch.classList.add('cz-bounce');
                swatch.addEventListener('animationend', () => {
                    swatch.classList.remove('cz-bounce');
                }, { once: true });
            }

            // Reset highlight on click to prevent flash/flicker during toggle animation.
            // (mouseover fires alongside click, setting highlight which dims other slices)
            if (this.chart.highlightSeries) {
                this.chart.highlightSeries(-1);
            }

            if (this.chart.toggleSeries) {
                this.chart.toggleSeries(index);
            }
        }

        /** Highlight hovered series, blur others */
        _onMouseOver(e) {
            const itemEl = e.target.closest('.cz-legend-item');
            if (!itemEl) return;
            const index = parseInt(itemEl.getAttribute('data-index'), 10);
            if (isNaN(index)) return;
            if (this.chart.highlightSeries) {
                this.chart.highlightSeries(index);
            }
        }

        /** Reset highlight */
        _onMouseOut(e) {
            // Only fire when mouse leaves the legend container entirely
            const related = e.relatedTarget;
            if (related && this.container.contains(related)) return;
            if (this.chart.highlightSeries) {
                this.chart.highlightSeries(-1);
            }
        }

        destroy() {
            this.container.removeEventListener('click', this._onClick);
            this.container.removeEventListener('mouseover', this._onMouseOver);
            this.container.removeEventListener('mouseout', this._onMouseOut);
            this.container.innerHTML = '';
        }
    }

    CZ.Legend = Legend;
})(window.CZ = window.CZ || {});
