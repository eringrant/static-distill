// Distill-style slider component using D3
class DistillSlider {
  constructor(selector, options = {}) {
    this.container = d3.select(selector);
    this.min = options.min !== undefined ? options.min : 0;
    this.max = options.max !== undefined ? options.max : 100;
    this.step = options.step !== undefined ? options.step : 1;
    this.value = options.value !== undefined ? options.value : this.min;
    this.ticks = options.ticks !== undefined ? options.ticks : false;
    this.onChange = options.onChange || (() => {});
    this.onInput = options.onInput || (() => {});

    this.scale = d3.scaleLinear()
      .domain([this.min, this.max])
      .range([0, 1])
      .clamp(true);

    this.render();
    this.attachEvents();
    this.update(this.value, false);
  }

  render() {
    this.container.html(`
      <div class="d-slider">
        <div class="d-slider-track"></div>
        <div class="d-slider-fill"></div>
        <div class="d-slider-knob"></div>
        <div class="d-slider-ticks"></div>
      </div>
    `);

    this.slider = this.container.select('.d-slider');
    this.track = this.slider.select('.d-slider-track');
    this.fill = this.slider.select('.d-slider-fill');
    this.knob = this.slider.select('.d-slider-knob');
    this.ticksContainer = this.slider.select('.d-slider-ticks');

    if (this.ticks) {
      this.renderTicks();
    }
  }

  renderTicks() {
    let tickData = [];
    if (this.step !== 'any') {
      tickData = d3.range(this.min, this.max + 1e-6, this.step);
    } else {
      tickData = this.scale.ticks(10);
    }

    this.ticksContainer.selectAll('.tick')
      .data(tickData)
      .join('div')
      .attr('class', 'tick')
      .style('left', d => (this.scale(d) * 100) + '%');
  }

  attachEvents() {
    const self = this;

    const drag = d3.drag()
      .on('start', function(event) {
        self.slider.classed('dragging', true);
      })
      .on('drag', function(event) {
        const bbox = self.track.node().getBoundingClientRect();
        // In D3 v7, we need to use the sourceEvent for mouse coordinates
        const clientX = event.sourceEvent.clientX;
        const x = clientX - bbox.left;
        const width = bbox.width;
        const fraction = Math.max(0, Math.min(1, x / width));
        const newValue = self.scale.invert(fraction);
        self.update(newValue, true);
      })
      .on('end', function(event) {
        self.slider.classed('dragging', false);
        self.onChange(self.value);
      });

    this.slider.call(drag);

    // Keyboard support
    this.slider.node().tabIndex = 0;
    this.slider.on('keydown', function(event) {
      let newValue = self.value;
      switch(event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = self.value - self.step;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = self.value + self.step;
          break;
        case 'Home':
          newValue = self.min;
          break;
        case 'End':
          newValue = self.max;
          break;
        default:
          return;
      }
      event.preventDefault();
      self.update(newValue, true);
      self.onChange(self.value);
    });
  }

  update(value, dispatchInput = false) {
    let v = value;
    if (this.step !== 'any') {
      v = Math.round(value / this.step) * this.step;
    }
    v = Math.max(Math.min(this.max, v), this.min);

    if (this.value !== v) {
      this.value = v;
      if (dispatchInput) {
        this.onInput(this.value);
      }
    }

    const pos = this.scale(this.value) * 100;
    this.knob.style('left', pos + '%');
    this.fill.style('width', pos + '%');
  }

  setValue(value) {
    this.update(value, false);
  }

  getValue() {
    return this.value;
  }
}

// Auto-initialize sliders on page load
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for D3 to be fully loaded
  setTimeout(function() {
    document.querySelectorAll('[data-slider]').forEach(element => {
      if (!element.id) {
        console.error('Slider element must have an id');
        return;
      }

      const min = parseFloat(element.dataset.min) || 0;
      const max = parseFloat(element.dataset.max) || 100;
      const step = parseFloat(element.dataset.step) || 1;
      const value = parseFloat(element.dataset.value) || min;
      const ticks = element.dataset.ticks !== undefined;

      try {
        const slider = new DistillSlider(`#${element.id}`, {
          min, max, step, value, ticks
        });

        // Store slider instance on element
        element.slider = slider;
      } catch(e) {
        console.error('Error creating slider:', e);
      }
    });
  }, 100);
});
