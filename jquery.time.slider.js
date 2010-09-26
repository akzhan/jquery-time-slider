/*global jQuery, clearInterval, setInterval */
(function($)
{
	var reText = /^(\d+)\:(\d+)/;
	var reInput = /^input|textarea$/i;
	var DATA_KEY = 'timeslider-object';
	var KEEP_CHAIN = { keepChain: true };
	var VK_LEFT = 37;
	var VK_RIGHT = 39;

	var utils = {
		normalize: function(tm)
		{
			tm.setSeconds(0);
			tm.setMilliseconds(0);
			var minutes = tm.getMinutes();
			minutes = Math.floor((minutes + 14) / 15) * 15;
			tm.setMinutes(minutes);
			return tm;
		},
		getNow: function()
		{
			return utils.normalize(new Date());
		},
		fromText: function(text)
		{
			var r = new Date();
			var m = text.match(reText);
			if (m !== null)
			{
				r.setHours(parseInt(m[1], 10));
				r.setMinutes(parseInt(m[2], 10));
			}
			return utils.normalize(r);
		},
		toText: function(tm)
		{
			var minutes = tm.getMinutes().toString();
			if (minutes.length < 2)
			{
				minutes = '0' + minutes;
			}
			return tm.getHours().toString() + ':' + minutes;
		},
		fromHour: function(hours)
		{
			var r = new Date();
			r.setHours(hours);
			r.setMinutes(0);
			return utils.normalize(r);
		},
		toPixels: function(tm)
		{
			var hm = tm.getMinutes() / 15 + tm.getHours() * 4;
			return hm;
		},
		fromPixels: function(x)
		{
			var r = utils.getNow();
			var minutes = x * 15;
			var hours = Math.floor(minutes / 60);
			minutes = minutes % 60;
			if (hours > 23)
			{
				hours = 23;
				minutes = 45;
			}
			r.setHours(hours);
			r.setMinutes(minutes);
			return r;
		},
		isLeftEdge: function(value)
		{
			return  value.getHours() === 0 && value.getMinutes() === 0;
		},
		isRightEdge: function(value)
		{
			return  value.getHours() == 23 && value.getMinutes() == 45;
		},
		mousehold: function(options, handler)
		{
			var $this = this;
			var onHoldTimer = false;
			var tickCount = 0;

			var callHandler = function()
			{
				tickCount++;
				if (tickCount != 1 && tickCount <= options.holdDelay)
				{
					return $this;
				}
				return $this.each(function()
				{
					handler.call(this);
				});
			};

			var releaser = function(e)
			{
				e.preventDefault();
				clearInterval(onHoldTimer);
				$('body').unbind('mouseup', releaser);
				$this.unbind('mouseout', releaser);
				onHoldTimer = false;
				tickCount = 0;
			};

			return $this.mousedown(function(e)
			{
				e.preventDefault();
				callHandler();
				if (onHoldTimer)
				{
					return;
				}
				onHoldTimer = setInterval(callHandler, options.holdTimeout);
				$('body').mouseup(releaser);
				$this.mouseout(releaser);
			});
		}
	};

	/**
	 * @constructor
	 */
	var TimeSlider = function(elt, options)
	{
		var $this = $(elt);
		if (options === null)
		{
			options = {};
		}
		options = $.extend(true, {}, $.fn.timeslider.defaults, options);

		var fromInput = reInput.test(elt.tagName);
		if (!options.value)
		{
			if (fromInput && $this.val() !== '')
			{
				options.value = $this.val();
			}
			else if (!fromInput && $this.text() !== '')
			{
				options.value = $this.text();
			}
			else
			{
				options.value = utils.getNow();
			}
		}

		var $container = $('<div class="timeslider-container" unselectable="on"></div>');
		var $downArrow = $('<div class="timeslider-arrow timeslider-down-arrow" unselectable="on"></div>');
		var $upArrow = $('<div class="timeslider-arrow timeslider-up-arrow" unselectable="on"></div>');
		var $sliderLine = $('<div class="timeslider-slider-line" unselectable="on"></div>');
		var $labels = $('<div class="timeslider-labels" unselectable="on"></div>');
		var $slider = $('<a class="timeslider-slider" unselectable="on" href="javascript:;">&nbsp;</a>');
		var $input = fromInput ? $this : $('<input type="text" maxlength="5" size="5" />');
		var $outmostContainer = $('<span class="timeslider-container"></span>');

		if (!fromInput && $this.attr('name'))
		{
			options.name = $this.attr('name');
			$this.attr('name', '');
		}
		if (options.name)
		{
			$input.attr('name', options.name);
		}
		if ($input.attr('tabindex'))
		{
			$slider.attr('tabindex', $input.attr('tabindex'));
		}

		$sliderLine.append($slider);

		var addLabelFor = function(hours)
		{
			var div = $('<div class="timeslider-label">' + hours.toString() + '</div>');
			div.css('left', utils.toPixels(utils.fromHour(hours)) + 'px');
			$labels.append(div);
		};

		addLabelFor(5);
		addLabelFor(12);
		addLabelFor(20);

		$container.append($downArrow).append($sliderLine).append($upArrow);
		$container.append($labels);

		$outmostContainer.append($container);
		$this.hide().after($outmostContainer);

		var value = null;
		var moving = false;
		var disabled = false;
		var activeSliderTabIndex = null;

		var updateSlider = function()
		{
			$slider.show().css('left', utils.toPixels(value) + 'px');
		};

		var updateTitle = function()
		{
			$sliderLine.attr('title', utils.toText(value));
		};

		var updateInput = function()
		{
			$input.val(utils.toText(value));
		};

		var updateArrows = function()
		{
			if (utils.isLeftEdge(value))
			{
				$downArrow.addClass('timeslider-disabled');
			}
			else
			{
				$downArrow.removeClass('timeslider-disabled');
			}
			if (utils.isRightEdge(value))
			{
				$upArrow.addClass('timeslider-disabled');
			}
			else
			{
				$upArrow.removeClass('timeslider-disabled');
			}
		};

		var pleaseSet = function(newValue)
		{
			if ('string' == typeof newValue)
			{
				newValue = utils.fromText(newValue);
			}
			else
			{
				newValue = utils.normalize(newValue);
			}
			value = newValue;
			updateInput();
			updateSlider();
			updateTitle();
			updateArrows();
			$this.change();
			return KEEP_CHAIN;
		};

		var pleaseEnable = function()
		{
			if (disabled)
			{
				$container.removeClass('timeslider-disabled');
				$input.removeAttr('disabled');
				if (activeSliderTabIndex)
				{
					$slider.attr('tabindex', activeSliderTabIndex);
				}
				else
				{
					$slider.removeAttr('tabindex');
				}
				disabled = false;
			}
			$this.trigger('toggled');
			return KEEP_CHAIN;
		};

		var pleaseDisable = function()
		{
			if (!disabled)
			{
				$container.addClass('timeslider-disabled');
				activeSliderTabIndex = $slider.attr('tabindex');
				$slider.attr('tabindex', -1).blur();
				$input.attr('disabled', 'disabled');
				disabled = true;
			}
			$this.trigger('toggled');
			return KEEP_CHAIN;
		};

		var dragAcceptor = function(e)
		{
			e.preventDefault();
			if (disabled)
			{
				return;
			}
			pleaseSet(utils.fromPixels(e.pageX - $sliderLine.offset().left));
		};

		var releaser = function(e)
		{
			e.preventDefault();
			$sliderLine.unbind('mousemove', dragAcceptor);
			$('body').unbind('mouseup', releaser);
			moving = false;
		};

		$slider.mousedown(function(e)
		{
			e.preventDefault();
			if (moving || disabled)
			{
				return;
			}
			moving = true;
			$sliderLine.mousemove(dragAcceptor);
			$('body').mouseup(releaser);
		});

		if (options.clickable)
		{
			$sliderLine.addClass('timeslider-slider-line-clickable');
			$sliderLine.click(dragAcceptor);
		}

		var pleaseStepDown = function()
		{
			if (utils.isLeftEdge(value))
			{
				return;
			}
			var hours = value.getHours();
			var minutes = value.getMinutes();
			if (minutes === 0)
			{
				minutes = 45;
				value.setHours(hours - 1);
			}
			else
			{
				minutes -= 15;
			}
			value.setMinutes(minutes);
			return pleaseSet(value);
		};

		var pleaseStepUp = function()
		{
			if (utils.isRightEdge(value))
			{
				return;
			}
			var hours = value.getHours();
			var minutes = value.getMinutes();
			if (minutes == 45)
			{
				minutes = 0;
				value.setHours(hours + 1);
			}
			else
			{
				minutes += 15;
			}
			value.setMinutes(minutes);
			return pleaseSet(value);
		};

		var stepDownThroughControl = function()
		{
			if (disabled)
			{
				return;
			}
			pleaseStepDown();
		};

		var stepUpThroughControl = function()
		{
			if (disabled)
			{
				return;
			}
			pleaseStepUp();
		};

		utils.mousehold.call($downArrow, options, stepDownThroughControl);
		utils.mousehold.call($upArrow, options, stepUpThroughControl);

		var focusOnSlider = function(e)
		{
			e.preventDefault();
			if (disabled)
			{
				return;
			}
			$slider.focus();
		};

		$input.focus(focusOnSlider);
		$upArrow.add($downArrow).add($sliderLine).click(focusOnSlider);

		$slider.keydown(function(e)
		{
			switch(e.keyCode)
			{
			case VK_LEFT:
				e.preventDefault();
				stepDownThroughControl();
				break;
			case VK_RIGHT:
				e.preventDefault();
				stepUpThroughControl();
				break;
			}
		});

		$.extend(this, {
			set: pleaseSet,
			get: function() { return value; },
			disable: pleaseDisable,
			enable: pleaseEnable,
			enabled: function() { return !disabled; },
			stepUp: pleaseStepUp,
			stepDown: pleaseStepDown
		});

		$this.data(DATA_KEY, this);

		this.set(options.value);
		if (options.disabled || (fromInput && $input.attr('disabled')))
		{
			this.disable();
		}
		if (!fromInput)
		{
			$this.after($input);
		}
		if (!options.showValue)
		{
			$input.css({position: 'absolute', left: -5000, width: 1, height: 1, padding: 0, margin: 0});
		}
		$input.attr({readonly: 'readonly', tabindex: -1}).show();
	};

	$.extend(TimeSlider.prototype, {
		toggle: function()
		{
			return this.enabled() ? this.disable() : this.enable();
		}
	});

	$.fn.timeslider = function(options)
	{
		var command = null;

		var follow = function()
		{
			var timeslider = $.data(this, DATA_KEY);
			return timeslider[command].call(timeslider, options);
		};

		if ('string' == typeof options)
		{
			command = options;
			options = arguments[1] || {};
			var retValue = this;
			this.each(function()
			{
				retValue = follow.call(this);
			});
			return (retValue == KEEP_CHAIN) ? this : retValue;
		}

		return this.each(function()
		{
			new TimeSlider(this, options);
		});
	};

	$.fn.timeslider.defaults = {
		showValue: true,
		clickable: false,
		holdTimeout: 100,
		holdDelay: 3
	};

})(jQuery);

