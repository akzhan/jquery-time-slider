(function($)
{
	var reText = /^(\d+)\:(\d+)/;
	var reInput = /^input|textarea$/i;
	var DATA_CMDS = 'timeslider-commands';
	var VK_LEFT = 37;
	var VK_RIGHT = 39;

	var normalize = function(tm)
	{
		tm.setSeconds(0);
		tm.setMilliseconds(0);
		var minutes = tm.getMinutes();
		minutes = Math.floor((minutes + 14) / 15) * 15;
		tm.setMinutes(minutes);
		return tm;
	};

	var getNow = function()
	{
		return normalize(new Date());
	};

	var fromText = function(text)
	{
		var r = new Date();
		var m = text.match(reText);
		if (m != null)
		{
			r.setHours(parseInt(m[1]));
			r.setMinutes(parseInt(m[2]));
		}
		return normalize(r);
	};

	var toText = function(tm)
	{
		var minutes = tm.getMinutes().toString();
		if (minutes.length < 2)
		{
			minutes = '0' + minutes;
		}
		return tm.getHours().toString() + ':' + minutes;
	};

	var fromHour = function(hours)
	{
		var r = new Date();
		r.setHours(hours);
		r.setMinutes(0);
		return normalize(r);
	};

	var toPixels = function(tm)
	{
		var hm = tm.getMinutes() / 15 + tm.getHours() * 4;
		return hm;
	};

	var fromPixels = function(x)
	{
		var r = getNow();
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
	};

	var isLeftEdge = function(value)
	{
		return  value.getHours() == 0 && value.getMinutes() == 0;
	};

	var isRightEdge = function(value)
	{
		return  value.getHours() == 23 && value.getMinutes() == 45;
	};

	$.fn.timeslider = function(options)
	{
		var make = function()
		{
			var $this = $(this);
			if (options == null)
			{
				options = {};
			}

			var fromInput = reInput.test(this.tagName);
			if (!options.value && fromInput && $this.val() != '')
			{
				options.value = $this.val();
			}
			if (!options.value && !fromInput && $this.text() != '')
			{
				options.value = $this.text();
			}
			if (!options.value)
			{
				options.value = getNow();
			}
			var $container = $('<div class="timeslider-container" unselectable="on"></div>');

			var $downArrow = $('<div class="timeslider-arrow timeslider-down-arrow" unselectable="on"></div>');
			var $upArrow = $('<div class="timeslider-arrow timeslider-up-arrow" unselectable="on"></div>');
			var $sliderLine = $('<div class="timeslider-slider-line" unselectable="on"></div>');
			var $labels = $('<div class="timeslider-labels" unselectable="on"></div>');
			var $slider = $('<a class="timeslider-slider" unselectable="on" href="javascript:;">&nbsp;</a>');
			var $input = fromInput ? $this : $('<input type="hidden" />');

			if (!fromInput)
			{
				if ($this.attr('name'))
				{
					options.name = $this.attr('name');
					$this.attr('name', '');
				}
				$this.after($input);
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
				div.css('left', toPixels(fromHour(hours)) + 'px');
				$labels.append(div);
			};

			addLabelFor(5);
			addLabelFor(12);
			addLabelFor(20);

			$container.append($downArrow).append($sliderLine).append($upArrow);
			$container.append($labels);

			var $outmostContainer = $('<div class="timeslider-container"></div>');
			$outmostContainer.append($container);
			$this.hide().after($outmostContainer);

			var value = null;
			var moving = false;
			var disabled = false;

			var updateSlider = function()
			{
				$slider.show().css('left', toPixels(value) + 'px');
			};

			var updateInput = function()
			{
				$input.val(toText(value));
			};

			var updateArrows = function()
			{
				if (isLeftEdge(value))
				{
					$downArrow.addClass('timeslider-disabled');
				}
				else
				{
					$downArrow.removeClass('timeslider-disabled');
				}
				if (isRightEdge(value))
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
					newValue = fromText(newValue);
				}
				else
				{
					newValue = normalize(newValue);
				}
				value = newValue;
				updateInput();
				updateSlider();
				updateArrows();
				return $this.change();
			};

			var pleaseGet = function()
			{
				return value;
			};

			var pleaseEnabled = function()
			{
				return !disabled;
			};

			var pleaseEnable = function()
			{
				if (disabled)
				{
					$container.removeClass('timeslider-disabled');
					disabled = false;
				}
				return $this.trigger('toggled');
			};

			var pleaseDisable = function()
			{
				if (!disabled)
				{
					$container.addClass('timeslider-disabled');
					disabled = true;
				}
				return $this.trigger('toggled');
			};

			var pleaseToggle = function()
			{
				return disabled ? pleaseEnable() : pleaseDisable();
			};

			var dragger = function(e)
			{
				if (disabled)
				{
					return;
				}
				pleaseSet(fromPixels(e.pageX - $sliderLine.offset().left ));
			};

			var releaser = function()
			{
				$sliderLine.unbind('mousemove', dragger);
				$('body').unbind('mouseup', releaser);
				moving = false;
			};

			$slider.mousedown(function()
			{
				if (moving || disabled)
				{
					return;
				}
				moving = true;
				$sliderLine.mousemove(dragger);
				$('body').mouseup(releaser);
			});

			$downArrow.click(function()
			{
				if (disabled || isLeftEdge(value))
				{
					return;
				}
				var hours = value.getHours();
				var minutes = value.getMinutes();
				if (minutes == 0)
				{
					minutes = 45;
					value.setHours(hours - 1);
				}
				else
				{
					minutes -= 15;
				}
				value.setMinutes(minutes);
				pleaseSet(value);
			});

			$upArrow.click(function()
			{
				if (disabled || isRightEdge(value))
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
				pleaseSet(value);
			});

			$slider.keydown(function(e)
			{
				switch(e.keyCode)
				{
				case VK_LEFT:
					$downArrow.click();
					e.preventDefault();
					break;
				case VK_RIGHT:
					$upArrow.click();
					e.preventDefault();
					break;
				}
			});

			var commands = {
				'set': pleaseSet,
				'get': pleaseGet,
				'disable': pleaseDisable,
				'enable': pleaseEnable,
				'toggle': pleaseToggle,
				'enabled': pleaseEnabled
			};

			$this.data(DATA_CMDS, commands);

			pleaseSet(options.value);
			if (options.disabled || (fromInput && $input.attr('disabled')))
			{
				pleaseDisable();
			}
		};

		var command = null;

		var follow = function()
		{
			var $this = $(this);
			return $this.data(DATA_CMDS)[command].call($this, options);
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
			return retValue;
		}

		return this.each(make);
	};

})(jQuery);

