$(function(){
	// Default settings
	var defaults = {
		// Dropdown from Twitter Bootstrap v3
		html: function(context){
			return '<div class="dropdown">'
					+ '<ul class="dropdown-menu" style="overflow-y: auto; max-height: 300px;">'
						+ context.list.map(function(value, i){
							return '<li class="' + (context.index === i ? 'active' : '') + '">'
									+ '<a href="#">' + value + '</a>'
								+ '</li>';
						}).join('')
					+ '</ul>'
				+ '</div>';
		}
	}

	// Get Caret
	var caret = function(el){
		// Except IE
		if (el.selectionStart) {
			return {
				start: el.selectionStart,
				end: el.selectionEnd
			};
		}
		// IE @todo 未確認
		else if (document.selection) {
			var range = document.selection.createRange();
			var length = range.text.length;
			range.moveStart( "character", - 1 );
			var start = range.text.length;
			return {
				start: range.text.length,
				end: start + length
			};
		}
		return {start:0, end:0};
	}

	// Scroll to $el.
	var scrollTo = function($parent, $el){
		var scrollTop = $parent.scrollTop();
		var scrollBottom = scrollTop + $parent.height();
		var top = $el.position().top;
		var bottom = top + $el.height();
		if (top < 0) return $parent.scrollTop(scrollTop + top)
		if (bottom > scrollBottom) return $parent.scrollTop(scrollTop + bottom - scrollBottom);
	}

	var mixin = function(){
		var res = {};
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			for (var j in arg) {
				res[j] = arg[j];
			}
		}
		return res;
	};

	// キーコード
	keyCode = {
		ENTER: 13,
		ESC: 27,
		SPACE: 32,
		PAGE_UP: 33,
		PAGE_DOWN: 34,
		END: 35,
		HOME: 36,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40
	};

	// サジェスト
	// ------------------
	var Suggest = function(el, options){
		if (typeof options == 'function') options = {matcher: options};

		options = mixin(defaults, options);

		this.el = el;
		this.$el = $(el);
		this.options = options;
		this.matcher = options.matcher;
		this.html = options.html;
		// ドロップダウン挿入先エレメントを取得する。
		this.$dropdown = options.$dropdown;
		if (!this.$dropdown) this.$dropdown = $('body > .suggest-dropdown').eq(0);
		if (this.$dropdown.length == 0) this.$dropdown = $('<div class="suggest-dropdown"/>').appendTo($('body'));
		// 開始
		this.start();
	};

	// 開始
	// ------------------
	Suggest.prototype.start = function() {
		var $el = this.$el;
		var el = this.el;
		var matcher = this.matcher.bind(el);
		var dropdown = this.dropdown.bind(this);
		var remove = this.remove.bind(this);
		// テキストボックス・テキストエリアへの文字列入力時
		$el.on('input.suggest', function(e){
			remove();
			var text = $el.val();
			if (!text) return;
			var target = text.slice(0, caret(el).start);

			matcher(target, dropdown);
		});
		// キーダウン時の処理
		this.$el.on('keydown.suggest', this.keydown.bind(this));
	};

	// 終了
	// ------------------
	Suggest.prototype.stop = function() {
		this.$el.off('input.suggest');
		this.$el.off('keydown.suggest');
		this.remove();
	};

	// ドロップダウンの削除
	// ------------------
	Suggest.prototype.remove = function(){
		this.$el.off('keyup.suggest');
		this.$el.off('blur.suggest');
		this.$dropdown && this.$dropdown.empty();
	}

	// ドロップダウンの描画
	// ------------------
	Suggest.prototype.draw = function(){
		var options = this.options;
		var $dropdown = this.$dropdown;

		// 初期化
		this.remove();

		// キー押下時の処理
		this.$el.on('keyup.suggest', this.keyup.bind(this));
		// フォーカスを外れた場合は削除
		this.$el.on('blur.suggest', this.remove.bind(this));

		// HTML作成
		var html = this.html(this);
		// 描画
		$dropdown.html(html);
		// 位置の計算と設定
		var offset = this.$el.offset();
		offset.top += this.$el.outerHeight();
		this.$dropdown.css({
			'position': 'absolute',
			'top': offset.top,
			'left': offset.left,
			'z-index': '10000',
		})
		// 表示
		$dropdown.find('ul').dropdown('toggle');
		// ページサイズを計算
		if ($dropdown.find('li').height()) {
			this.pageSize = parseInt($dropdown.find('ul').height() / $dropdown.find('li').height(), 10);
		}
		// 下部分がはみ出てしまっている場合は、高さを調節します。
		var $menu = this.$dropdown.find('.dropdown-menu');
		var bottom = window.innerHeight - (offset.top + $menu.outerHeight());
		if (bottom < 0) $menu.css('height', $menu.height() + bottom);
		// 隠れていたらスクロール
		var $active = $dropdown.find('li.active');
		scrollTo($dropdown.find('ul'), $active);

		// クリック時の処理
		var select = function(index, e){
			e.preventDefault();
			this.$el.focus();
			this.select(index);
		};
		var alist = $dropdown.find('a').get();
		for (var i = 0; i < alist.length; i++) {
			$(alist[i]).on('mousedown.suggest', select.bind(this, i))
		}
	}

	// 候補からの選択
	// ------------------
	Suggest.prototype.select = function(index){
		this.index = typeof index === 'number' ? index : this.index;
		this.remove();
		this.callback(this.list[this.index], this.index, this.replace.bind(this));
		this.remove();
	}

	// ドロップダウンの表示とイベントの設定
	// ------------------
	Suggest.prototype.dropdown = function(list, index, callback){
		if (!list || list.length === 0) return;
		if (arguments.length == 2) {
			callback = index;
			index = 0;
		}

		// コンテキストを初期化
		this.list = list;
		this.index = index || 0;
		this.callback = callback;

		// ドロップダウンを描画
		this.draw();
	};

	// キーダウンの捕捉
	// ------------------
	Suggest.prototype.keydown = function(e){
		var $el = this.$el;
		var el = $el.get(0);
		var matcher = this.matcher.bind(el);
		var list = this.list;
		var dropdown = this.dropdown.bind(this);

		// リストが表示されていない状態での処理
		switch (e.keyCode) {
		// SPACE(Ctrl): リストの再描画
		case keyCode.SPACE:
			if (!e.ctrlKey) return;
			this.remove();
			var text = $el.val();
			if (!text) return;
			var target = text.slice(0, caret(el).start);
			return matcher(target, dropdown);
		}

		// リストが表示される場合の処理
		if (!this.$dropdown) return;
		if (this.$dropdown.html() === '') return;
		if (this.$dropdown.parent().length === 0) return;

		switch (e.keyCode) {
		// ENTER: リスト内から選択
		case keyCode.ENTER:
			e.preventDefault();
			return this.select();

		// ESC: ドロップダウンを消す
		case keyCode.ESC:
			return this.remove();

		// PAGE_UP: 前のページ
		case keyCode.PAGE_UP:
			e.preventDefault();
			this.index -= this.pageSize;
			if (this.index < 0) this.index = list.length - 1;
			return this.draw();

		// PAGE_DOWN: 次のページ
		case keyCode.PAGE_DOWN:
			e.preventDefault();
			this.index += this.pageSize;
			if (this.index >= list.length) this.index = 0;
			return this.draw();

		// LEFT: リストの再描画
		case keyCode.LEFT:
			if (e.ctrlKey) return; // Ctrlキー押下時は除外
			this.remove();
			var text = $el.val();
			if (!text) return;
			var target = text.slice(0, caret(el).start - 1);
			return matcher(target, dropdown);

		// UP: リストを上に移動
		case keyCode.UP:
			e.preventDefault();
			this.index--;
			if (this.index < 0) this.index = list.length - 1;
			return this.draw();

		// RIGHT: リストの再描画
		case keyCode.RIGHT:
			if (e.ctrlKey) return; // Ctrlキー押下時は除外
			this.remove();
			var text = $el.val();
			if (!text) return;
			var target = text.slice(0, caret(el).start + 1);
			return matcher(target, dropdown);

		// DOWN: リストを下に移動
		case keyCode.DOWN:
			e.preventDefault();
			this.index++;
			if (this.index >= list.length) this.index = 0;
			return this.draw();
		}
	};

	// キーアップの捕捉
	// ------------------
	Suggest.prototype.keyup = function(e){
		if (!this.$dropdown) return;
		if (this.$dropdown.parent().length === 0) return;

		var $el = this.$el;
		var el = $el.get(0);
		var matcher = this.matcher.bind(el);
		var list = this.list;
		var dropdown = this.dropdown.bind(this);

		switch (e.keyCode) {

		// END: リストの再描画
		// HOME: リストの再描画
		case keyCode.END:
		case keyCode.HOME:
			this.remove();
			var text = $el.val();
			if (!text) return;
			var target = text.slice(0, caret(el).start);
			return matcher(target, dropdown);

		// LEFT(Ctrl): リストの再描画
		// RIGHT(Ctrl): リストの再描画
		case keyCode.LEFT:
		case keyCode.RIGHT:
			if (!e.ctrlKey) return;
			this.remove();
			var text = $el.val();
			if (!text) return;
			var target = text.slice(0, caret(el).start);
			return matcher(target, dropdown);
		}
	};

	// 置換
	// ------------------
	Suggest.prototype.replace = function(start, length, text, position){
		var $el = this.$el;
		var current = $el.val();
		var replaced = current.slice(0, start) + text + current.slice(start + length);
		$el.val(replaced).trigger('input').change();
		// Except IE
		if ($el.get(0).selectionStart) {
			$el.get(0).selectionStart = $el.get(0).selectionEnd = position;
		}
		// IE @todo 未対応
		else {

		}
	}

	// PLUGIN DEFINITION
	// =======================

	function Plugin(option) {
		return this.each(function () {
			var $el = $(this);
			var data	= $el.data('suggest');
			var options = (typeof option == 'object' || typeof option == 'function') && option;

			if (!data && !options && /start|stop/.test(option)) return
			if (!data) $el.data('suggest', (data = new Suggest(this, options)));
			if (typeof option == 'string') data[option].call($el);
		});
	}

	var old = $.fn.suggest;

	$.fn.suggest						 = Plugin;
	$.fn.suggest.Constructor = Suggest;


	// NO CONFLICT
	// =================

	$.fn.suggest.noConflict = function () {
		$.fn.suggest = old;
		return this;
	}

	$.fn.suggest.defaults = defaults;

})
