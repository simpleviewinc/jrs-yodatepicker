'use strict';

//
// var options = {
//     dp_id_name: 'mydiv_id',
//     id_name: 'id_name',
//     locale: 'en',
//     onDateSelected: function() {},
//     onClose: function() {},
//     months_to_display: 1,
//     close_onselect: boolean,
//     max_date: '1Y',
//     min_date: '1Y'
// }
//
// var start_datepicker = yodatepicker(options);
//

var yodatepicker = function(options) {

    var YoException = function(value) {
        this.value = value;
        this.message = 'yoException: something is wrong with ';
        this.toString = function() {
            return this.message + this.value;
        };
    };

    var configure = function(opts) {
        var cfg = {
            // Max months to display on a multi-month yodatepicker.
            MAX_CALENDARS: 2,

            // Element id where to display the yodatepicker.
            dp_id_name: opts.dp_id_name || '',

            // Element id where to populate a selected date.
            id_name: opts.id_name || '',

            // Localization.
            locale: opts.locale || 'en',

            // User defined function executed when selecting a date.
            ondateselected_callback: (opts.onDateSelected instanceof Function) ?
                                     opts.onDateSelected : null,

            // User defined function to be called when closing yodatepicker.
            onclose_callback: (opts.onClose instanceof Function) ?
                                     opts.onClose : null,

            // Number of months to display in multi-month yodatepicker.
            months_to_display: opts.months_to_display || 1,

            // Boolean triggers yodatepicker to close when user selects a date.
            close_onselect: opts.close_onselect,

            // Max date user can scroll forward to.
            max_date: get_max_date((opts.max_date || '1Y')),

            // Min date user can scroll backward to.
            min_date: get_min_date((opts.min_date || '*')),

            // The current date.
            currdate: new Date()
        };

        // TODO: Clean up this below.
        cfg.today = new Date(cfg.currdate.getFullYear(),
                             cfg.currdate.getMonth(),
                             cfg.currdate.getDate());

        // array of month names
        cfg.month_names = get_month_names(cfg.locale);

        // array of day of week names
        cfg.day_names = get_dow_names(cfg.locale);

        // Keeps track of the month the datepicker is on and will
        // not go past the min_date month (if set).
        cfg.mn = (cfg.currdate.getTime() < cfg.min_date.getTime()) ?
                 cfg.min_date.getMonth() : cfg.currdate.getMonth();

        // Keeps track of the year the datepicker is on and will
        // not go past the min_date year (if set).
        cfg.yy = (cfg.currdate.getTime() < cfg.min_date.getTime()) ?
                 cfg.min_date.getFullYear() : cfg.currdate.getFullYear();


        cfg.close_onselect = (!cfg.close_onselect) ? true : cfg.close_onselect;

        cfg.months_to_display = (cfg.months_to_display > cfg.MAX_CALENDARS) ?
                               cfg.MAX_CALENDARS : cfg.months_to_display;
        return cfg;
    };

    var citem = {
        day: 0,
        month: 0,
        year: 1900,
        first_dow: 0,
        total_days: 0,
        offset: 0,
        multi_cal: '',

        markup: function(tr_node, yo_id) {
            var the_html = '';
            var td_class = 'yo-datepicker-day-empty';

            if(this.offset >= this.first_dow) {
                var tmp_date = new Date(this.year, this.month, this.day);
                var content = this.day;
                var td_id = yo_id + '_' +
                            this.month+ '_' + this.day + '_' + this.year;

                if(tmp_date.valueOf() > cfg.max_date.valueOf()) {
                    td_class = 'yo-datepicker-day-noselect';
                    _yodatepicker.create_day(tr_node, content, td_id, td_class);
                }
                else if(tmp_date.valueOf() < cfg.min_date.valueOf()) {
                    td_class = 'yo-datepicker-day-noselect';
                    _yodatepicker.create_day(tr_node, content, td_id, td_class);
                }
                else if(tmp_date.valueOf() === cfg.today.valueOf()) {
                    td_class = 'yo-datepicker-day-current';
                    _yodatepicker.create_day(tr_node, content, td_id, td_class);
                }
                else {
                    td_class = 'yo-datepicker-day';
                    _yodatepicker.create_day(tr_node, content, td_id, td_class);
                }

                if(this.day >= this.total_days) { this.first_dow = 999; }
            }
            else {
                _yodatepicker.create_day(tr_node, '', '', td_class);
            }
            this.offset++;
            if(this.offset > this.first_dow) { this.day++; }
        }
    };

    var close_datepicker = function() {
        if(cfg.close_onselect) {
            document.getElementById(cfg.dp_id_name).innerHTML = '';
            if(cfg.id_name !== '') {
                eval('document.getElementById("' + cfg.id_name + '").focus();');
            }

            if(cfg.onclose_callback) { cfg.onclose_callback(); }
        }
    };

    var select_date = function(mm, dd, yy) {
        var the_month, the_day;

        mm++;    // Note: mm is the month number 0 - 11 so always add 1.
        if(mm < 10) {the_month = '0' + mm;} else { the_month = mm.toString(); }
        if(dd < 10) {the_day = '0' + dd;  } else { the_day = dd.toString();   }

        if(cfg.id_name !== '') {
            if(cfg.locale === 'en') {
                eval('document.getElementById("' + cfg.id_name +
                     '").value = the_month + "/" + the_day + "/" + yy');
            } else {
                eval('document.getElementById("' + cfg.id_name +
                     '").value = the_day + "/" + the_month + "/" + yy');
            }
        }

        if(cfg.ondateselected_callback) { cfg.ondateselected_callback(); }
        close_datepicker();
    };

    var dump_html = function(calendar_html) {
        var the_html = '<tt>';
        for(var j=0; j<calendar_html.length; j++) {
            var ch = calendar_html.charAt(j);
            if(ch === '<')      { ch = '&lt;'; }
            else if(ch === '>') { ch = '&gt;<br />'; }
            else if(ch === ' ') { ch = '&nbsp;'; }
            the_html += ch;
        }
        the_html += '</tt>';
        if(document.getElementById('htmldump') !== null) {
            document.getElementById('htmldump').innerHTML = the_html;
        }
    };

    var text = function(_text) {
        // Create and set a text nodel and return it.
        var node = document.createTextNode(_text);
        return node;
    };

    var element = function(_name, _attrs) {
        // Create and set an element node and return it.
        var node = document.createElement(_name);
        if(_attrs) {
            if(_attrs.id)      { node.setAttribute('id', _attrs.id); }
            if(_attrs.klass)   { node.setAttribute('class', _attrs.klass); }
            if(_attrs.style)   { node.setAttribute('style', _attrs.style); }
            if(_attrs.colspan) { node.setAttribute('colspan', _attrs.colspan); }
            if(_attrs.value)   { node.setAttribute('value', _attrs.value); }
            if(_attrs.type)    { node.setAttribute('type', _attrs.type); }
        }
        return(node);
    };

    var month_inc = function() {
        var scroll_date = new Date(cfg.yy, cfg.mn, cfg.today.getDate());
        if((scroll_date.getFullYear() === cfg.max_date.getFullYear()) &&
           (scroll_date.getMonth() >= cfg.max_date.getMonth())) {
            return;
        }

        if(cfg.mn < 11) { cfg.mn++; }
        else { cfg.mn = 0; cfg.yy++; }
        _yodatepicker.show();
    };

    var month_dec = function() {
        var scroll_date = new Date(cfg.yy, cfg.mn, cfg.today.getDate());
        if((scroll_date.getFullYear() === cfg.min_date.getFullYear()) &&
           (scroll_date.getMonth() <= cfg.min_date.getMonth())) {
            return;
        }

        if(cfg.mn > 0) { cfg.mn--; }
        else { cfg.mn = 11; cfg.yy--; }
        _yodatepicker.show();
    };

    var leap_year = function(yr) {
        return(yr % 400 === 0) || (yr % 4 === 0 && yr % 100 !== 0);
    };

    var get_dow_names = function(locale) {
        if(locale === undefined || locale === null) { locale = 'en'; }

        if(locale === 'es' || locale === 'fr') {
            return(['D', 'L', 'M', 'M', 'J', 'V', 'S']);
        }
        else if(locale === 'de') {
            return(['S', 'M', 'D', 'M', 'D', 'F', 'S']);
        }

        return(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    };

    var get_month_names = function(locale) {
        if(locale === undefined || locale === null) { locale = 'en'; }

        if(locale === 'es') {
            return(['Enero', 'Febrero', 'Marzo', 'Abril',
                    'Mayo', 'Junio', 'Julio', 'Augosto',
                    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']);
        }
        else if(locale === 'fr') {
            return(['Janvier', 'Fevrier', 'Mars', 'Avril',
                    'Mai', 'Juin', 'Juillet', 'Aout',
                    'Septembre', 'Octobre', 'Novembre', 'Decembre']);
        }
        else if(locale === 'de') {
            return(['Januar', 'Februar', 'Marz', 'April',
                    'Mai', 'Juni', 'Juli', 'August',
                    'September', 'Oktober', 'November', 'Dezember']);
        }

        return(['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December']);
    };

    var days_in_month = function(month_num, full_year) {
        // Jan == 0, Feb == 1, Mar == 2, ...
        if(month_num === 0 || month_num === 2 || month_num === 4 ||
           month_num === 6 || month_num === 7 || month_num === 9 ||
           month_num === 11) {
            return(31);
        }
        else if(month_num === 3 || month_num === 5 ||
           month_num === 8 || month_num === 10) {
            return(30);
        }

        return(leap_year(full_year) ? 29 : 28);
    };

    var get_max_date = function(param_max_date) {
        // Return a date object set to max_date.
        // Acceptable parameter formats: 3M, 6M, 9M, 1Y, 2Y, * (infinity)
        var date = new Date();
        var month = date.getMonth();
        var year = date.getFullYear();

        switch(param_max_date) {
            case '3M':
                if((month + 3) > 11) { month = (month +3) % 12; year++; }
                else { month += 3; }
                break;
            case '6M':
                if((month + 6) > 11) { month = (month +6) % 12; year++; }
                else { month += 6; }
                break;
            case '9M':
                if((month + 9) > 11) { month = (month +9) % 12; year++; }
                else { month += 9; }
                break;
            case '2Y':
                year += 2;
                break;
            case '*':  // infinity
                year = 3125;
                break;
            default:   // default to '1Y'
                year += 1;
        }
        return(new Date(year, month, date.getDate()));
    };

    var get_min_date = function(param_min_date) {
        // Return a date object set to min_date.
        // Acceptable parameter formats: 0, 3M, 6M, 9M, 1Y, 2Y, * (infinity)
        var date = new Date();
        var month = date.getMonth();
        var year = date.getFullYear();

        // If a Date object is passed in, use that.
        if(param_min_date instanceof Date) { return(param_min_date); }

        switch(param_min_date) {
            case '3M':
                if((month - 3) < 0) { month = (month -3) % 12; year--; }
                else { month -= 3; }
                break;
            case '6M':
                if((month - 6) < 0) { month = (month -6) % 12; year--; }
                else { month -= 6; }
                break;
            case '9M':
                if((month - 9) < 0) { month = (month -9) % 12; year--; }
                else { month -= 9; }
                break;
            case '1Y':
                year -= 1;
                break;
            case '2Y':
                year -= 2;
                break;
            case '*':
                year = 1900;
                break;
            default:
                break;  // default is the current date
        }
        return(new Date(year, month, date.getDate()));
    };

    var cfg = configure(options);

    // This object is returned and represents the public properties and methods.
    var _yodatepicker = {
        version: 'yo-da',

        hide: function() {
            close_datepicker();
        },

        set_min_date: function(mdate) {
            // This will override the cfg.min_date param.
            if(!mdate instanceof Date) { return false; }

            cfg.min_date = mdate;

            cfg.mn = (cfg.currdate.getTime() < cfg.min_date.getTime()) ?
                     cfg.min_date.getMonth() : cfg.currdate.getMonth();

            cfg.yy = (cfg.currdate.getTime() < cfg.min_date.getTime()) ?
                     cfg.min_date.getFullYear() : cfg.currdate.getFullYear();

            return cfg.min_date;
        },

        create_title_header: function(params) {
            // Creates the header on the yodatepicker.
            try {
                if(!params.tbody || !params.month || !params.year) {
                    throw new YoException(params);
                }

                var yo_id = 'yo-' + cfg.dp_id_name;
                var tr_class = 'yo-calendar-title-bar';
                var tr = params.tbody.appendChild(
                                      element('tr', { klass: tr_class }));

                var prev = yo_id + '-prev-month-' + params.calendar_number;
                var prev_style = 'yo-previous-month';
                tr.appendChild(element('td', {klass: prev_style, colspan: '1'}))
                  .appendChild(element('span', {id: prev}))
                  .appendChild(text('<'));

                var text_style = 'yo-calendar-month';
                tr.appendChild(element('td', {klass: text_style, colspan: '5'}))
                  .appendChild(text(params.month + ' ' + params.year));

                var next = yo_id + '-next-month-' + params.calendar_number;
                var next_style = 'yo-next-month';
                tr.appendChild(element('td', {klass: next_style, colspan: '1'}))
                  .appendChild(element('span', {id: next}))
                  .appendChild(text('>'));
            } catch(e) {
                console.log(e.toString());
                return false;
            }
            return true;
        },

        create_empty_week: function(tbody_node) {
            // Creates an entire week with empty days.
            try {
                if(!tbody_node) { throw new YoException(tbody_node); }
                var td_class = 'yo-datepicker-day-empty';
                var tbody_tr_node = tbody_node.appendChild(element('tr'));
                for(var i = 0; i < 7; i++) {
                    tbody_tr_node.appendChild(element('td', {klass: td_class}))
                                 .appendChild(text(' '));
                }
            } catch(e) {
                console.log(e.toString());
                return false;
            }
            return true;
        },

        create_day: function(tr, content, _id, _klass) {
            // Styles for a single day (cell) should be one of these classes:
            //
            // .yo-datepicker-day           // day is selectable
            // .yo-datepicker-day-current   // day is the current day
            // .yo-datepicker-day-empty     // empty content
            // .yo-datepicker-day-noselect  // day is not selectable
            try {
                tr.appendChild(element('td', {klass: _klass, id: _id}))
                  .appendChild(text(content));
            } catch(e) {
                console.log(e.toString());
                return false;
            }
            return true;
        },

/* --------------------------- */
/* jshint maxstatements: false */
/* --------------------------- */

        show: function() {
            var tbody_node;
            var yo_id = 'yo-' + cfg.dp_id_name;
            var root_node = document.getElementById(cfg.dp_id_name);
            if(!root_node) { throw new YoException(root_node); }

            tbody_node = root_node
                .appendChild(
                    element('div',{id: cfg.dp_id_name, klass: 'yo-container'}))
                .appendChild(element('table', {id: yo_id, klass: 'yo-content'}))
                .appendChild(element('tbody')).appendChild(element('tr'))
                .appendChild(element('td'))
                .appendChild(element('table', {klass: 'yo-calendar'}))
                .appendChild(element('tbody'));

            for(var i = 0; i < cfg.months_to_display; i++) {
                citem.day = 1;
                citem.month = cfg.mn;
                citem.year = cfg.yy;

                if(i > 0) {
                    if(cfg.mn < 11) { citem.month = cfg.mn +1; }
                    else { citem.month = 0; citem.year = cfg.yy +1; }
                }

                cfg.currdate.setDate(1); // set day of month to the 1st
                cfg.currdate.setMonth(citem.month); // set the month
                cfg.currdate.setFullYear(citem.year); // set to 4-digit year

                citem.offset = 0;
                citem.first_dow = cfg.currdate.getDay(); // 0 - 6 (sun - sat)
                citem.total_days = days_in_month(cfg.currdate.getMonth(),
                                                 cfg.currdate.getFullYear());

                citem.multi_cal = (cfg.months_to_display > 1) ? '_multi' : '';

                this.create_title_header({
                    tbody: tbody_node,
                    month: cfg.month_names[citem.month],
                    year: citem.year,
                    calendar_number: i
                });

                var weeks_created = 0;
                for(var j = 0; j < 6; j++) {
                    if(citem.first_dow === 999) { break; }
                    var yo_tbody_tr = tbody_node.appendChild(element('tr'));
                    for(var k = 0; k < 7; k++) {
                        citem.markup(yo_tbody_tr, yo_id);
                    }
                    weeks_created++;
                }

                // Output empty rows if needed so we have 6 rows total.
                for(var b = 0; b < (6-weeks_created); b++) {
                    this.create_empty_week(tbody_node);
                }
            }

            // Attach event listeners for the previous and next buttons.
            var prev_month_id = yo_id + '-prev-month' + citem.multi_cal + '-';
            var next_month_id = yo_id + '-next-month' + citem.multi_cal + '-';
            for(var x = 0; x < i; x++) {
                document.getElementById(prev_month_id + x).onclick = month_dec;
                document.getElementById(next_month_id + x).onclick = month_inc;
            }

            // Attach event listeners to the following events so that the
            // datepicker will close when the user clicks outside the calendar.
            document.getElementsByTagName('body')[0]
                    .onmousedown = close_datepicker;

            // Event onmouseover is set to disable onmousedown so that when
            // mouseover the datepicker, mousedown doesn't close it.
            document.getElementById(yo_id).onmouseover = function(e) {
                // IE 7-8 does not support event.currentTarget but does 
                // so for event.srcElement;
                var elem, elem_id, ev = e || window.event;
                var using_srcElement = false;
                try { elem = ev.currentTarget; }
                catch(err) { elem = ev.srcElement; using_srcElement = true; }
                try { elem_id = elem.id; }
                catch(err) { elem_id = (elem) ? elem : yo_id; }
                if(elem_id) {
                    document.getElementById(elem_id).onmouseover = function() {
                        document.getElementsByTagName('body')[0]
                                .onmousedown = null;
                    };
                }
                document.getElementsByTagName('body')[0].onmousedown = null;
            };

            // Event onmouseout is set to close_datepicker.
            document.getElementById(yo_id).onmouseout = function(e) {
                // IE 7-8 does not support event.currentTarget but does
                // so for event.srcElement;
                var elem, elem_id, ev = e || window.event;
                var using_srcElement = false;
                try { elem = ev.currentTarget; }
                catch(err) { elem = ev.srcElement; using_srcElement = true; }
                try { elem_id = elem.id; }
                catch(err) { elem_id = (elem) ? elem : yo_id; }
                if(elem_id) {
                    document.getElementById(elem_id).onmouseout = function() {
                        document.getElementsByTagName('body')[0]
                                .onmousedown = close_datepicker;
                    };
                }
                document.getElementsByTagName('body')[0]
                        .onmousedown = close_datepicker;
            };

            // Bind event listeners to each day for the onclick event.
            // Get an array of elements by the class name so we can get
            // each element id name to bind the onclick handler.
            var day_selectors = 'yo-datepicker-day' + citem.multi_cal;
            var day_tds = document.getElementsByClassName(day_selectors);
            for(var y = 0; y < day_tds.length; y++) {
                // string to match: 'yo-rates_calendar_id_9_22_2014'
                // Split on '_' then we can use the last three elements.
                var items = day_tds[y].id.split('_');
                var mmtmp = items[items.length -3];
                var ddtmp = items[items.length -2];
                var yytmp = items[items.length -1];
                var t_id = yo_id + '_' + mmtmp + '_' + ddtmp + '_' + yytmp;
                var s  = 'document.getElementById("' + t_id + '")' +
                         '.onclick = function() { select_date(' +
                          mmtmp + ',' + ddtmp + ',' + yytmp + '); };';
                if(document.getElementById(t_id)) {
                    eval(s);
                }
            }

            // The current day node will have a different class name so
            // we get that and bind the onclick handler.
            var selector = 'yo-datepicker-day-current' + citem.multi_cal;
            var curr_day_td = document.getElementsByClassName(selector);
            if(curr_day_td.length > 0) {
                var items = curr_day_td[0].id.split('_');
                var mmtmp = items[items.length -3];
                var ddtmp = items[items.length -2];
                var yytmp = items[items.length -1];
                var t_id = yo_id + mmtmp + '_' + ddtmp + '_' + yytmp;
                var s  = 'document.getElementById("' + t_id + '")' +
                         '.onclick = function() ' + '{ select_date(' +
                         mmtmp + ',' + ddtmp + ',' + yytmp + '); };';
                if(document.getElementById(t_id)) {
                    eval(s);
                }
            }

            return true;
        }
    };
/* --------------------------- */
/* jshint maxstatements: 20 */
/* --------------------------- */

    return _yodatepicker;
};
