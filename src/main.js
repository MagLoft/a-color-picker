import './main.css';
import { COLOR_NAMES, rgbToHex, hslToRgb, rgbToHsl } from './utils.js';

'use strict';

const DEFAULT = {
    attachTo: 'body',
    showHSL: true,
    showRGB: true,
    showHEX: true,
    color: '#ff0000'
};

const SL_BAR_SIZE = [200, 150],
    HUE_BAR_SIZE = [150, 16],
    HUE = 'H',
    SATURATION = 'S',
    LUMINANCE = 'L',
    RGB = 'RGB',
    RED = 'R',
    GREEN = 'G',
    BLUE = 'B',
    RGBHEX = 'RGBHEX',
    COLOR = 'COLOR',
    RGB_USER = 'RGB_USER',
    HSL_USER = 'HSL_USER';

const HTML_BOX = `<div class="a-color-picker-row a-color-picker-stack">
                            <canvas class="a-color-picker-sl"></canvas>
                            <div class="a-color-picker-dot"></div>
                        </div>
                        <div class="a-color-picker-row">
                            <div class="a-color-picker-preview"><input class="a-color-picker-clipbaord" type="text"></div>
                            <div class="a-color-picker-stack">
                                <canvas class="a-color-picker-h"></canvas>
                                <div class="a-color-picker-dot"></div>
                            </div>
                        </div>
                        <div class="a-color-picker-row a-color-picker-hsl">
                            <label>H</label>
                            <input name="H" type="number" maxlength="3" min="0" max="360" value="0">
                            <label>S</label>
                            <input name="S" type="number" maxlength="3" min="0" max="100" value="0">
                            <label>L</label>
                            <input name="L" type="number" maxlength="3" min="0" max="100" value="0">
                        </div>
                        <div class="a-color-picker-row a-color-picker-rgb">
                            <label>R</label>
                            <input name="R" type="number" maxlength="3" min="0" max="255" value="0">
                            <label>G</label>
                            <input name="G" type="number" maxlength="3" min="0" max="255" value="0">
                            <label>B</label>
                            <input name="B" type="number" maxlength="3" min="0" max="255" value="0">
                        </div>
                        <div class="a-color-picker-row a-color-picker-single-input">
                            <label>HEX</label>
                            <input name="RGBHEX" type="text" maxlength="7">
                        </div>`;

function parseElemnt(element, defaultElement, fallToDefault) {
    if (!element) {
        return defaultElement;
    } else if (element instanceof HTMLElement) {
        return element;
    } else if (element instanceof NodeList) {
        return element[0];
    } else if (typeof element == 'string') {
        return document.querySelector(element);
        // } else if ($ && element.jquery) {
        //     return element.get(0);
    } else if (fallToDefault) {
        return defaultElement;
    } else {
        return null;
    }
}

function canvasHelper(canvas) {
    const ctx = canvas.getContext('2d'),
        width = +canvas.width,
        height = +canvas.height;
    // questo gradiente da bianco (alto) a nero (basso) viene applicato come sfondo al canvas
    const whiteBlackGradient = ctx.createLinearGradient(1, 1, 1, height - 1);
    whiteBlackGradient.addColorStop(0, 'white');
    whiteBlackGradient.addColorStop(1, 'black');
    return {
        setHue(hue) {
            // gradiente con il colore relavito a lo HUE da sinistra a destra partendo da trasparente a opaco
            // la combinazione del gradiente bianco/nero e questo permette di avere un canvas dove 
            // sull'asse delle ordinate è espressa la saturazione, e sull'asse delle ascisse c'è la luminosità
            const colorGradient = ctx.createLinearGradient(0, 0, width - 1, 0);
            colorGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0)`);
            colorGradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 1)`);
            // applico i gradienti
            ctx.fillStyle = whiteBlackGradient;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = colorGradient;
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        },

        grabColor(x, y) {
            // recupera il colore del pixel in formato RGBA
            return ctx.getImageData(x, y, 1, 1).data;
        },

        findColor(r, g, b) {
            // TODO: se la luminosità è bassa posso controllare prima la parte inferiore
            const rowLen = width * 4,
                // visto che non sono sicuro di trovare il colore esatto considero un gap in + e - su tutti i 3 valori
                gap = 5,
                // array contenente tutti i pixel, ogni pixel sono 4 byte RGBA (quindi è grande w*h*4)
                data = ctx.getImageData(0, 0, width, height).data;
            let coord = [-1, -1];
            // console.log(data.length, r, g, b)
            // console.log(data)
            // console.time('findColor');
            // scorro l'array di pixel, ogni 4 byte c'è un pixel nuovo
            for (let ii = 0; ii < data.length; ii += 4) {
                if (Math.abs(data[ii] - r) <= gap &&
                    Math.abs(data[ii + 1] - g) <= gap &&
                    Math.abs(data[ii + 2] - b) <= gap) {
                    // console.log('found', ii, Math.floor(ii/rowLen), (ii%rowLen)/4);
                    coord = [(ii % rowLen) / 4, Math.floor(ii / rowLen)];
                    break;
                }
            }
            // console.timeEnd('findColor');
            return coord;
        }
    }
}

function cssColorToRgb(color) {
    if (color) {
        const colorByName = COLOR_NAMES[color.toString().toLowerCase()];
        // considero sia il formato esteso #RRGGGBB che quello corto #RGB
        // provo a estrarre i valori da colorByName solo se questo è valorizzato, altrimenti uso direttamente color
        const [, , , r, g, b, , rr, gg, bb] = /^\s*#?((([0-9A-F])([0-9A-F])([0-9A-F]))|(([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})))\s*$/i.exec(colorByName || color) || [];
        if (r !== undefined) return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
        else if (rr !== undefined) return [parseInt(rr, 16), parseInt(gg, 16), parseInt(bb, 16)];
    }
    return undefined;
}

/**
 * Converte il colore in ingresso nel formato [r,g,b].
 * Color può assumere questi valori:
 * - array con [r,g,b] (viene ritornato così come è)
 * - nome del colore
 * - colore nel formato RGB HEX sia compatto che esteso
 *
 * @param      {string|array}    color   Il colore da convertire
 * @return     {array}  colore nel formato [r,g,b] o undefined se non valido
 */
function parseColorToRgb(color) {
    if (Array.isArray(color)) {
        color = [limit(color[0], 0, 255), limit(color[1], 0, 255), limit(color[2], 0, 255)];
        return color;
    } else {
        const parsed = cssColorToRgb(color);
        if (parsed) {
            return parsed;
        } else {
            // TODO: considerare il formato rgb(), rgba(), hsl() e hsla()
        }
    }
}

function limit(value, min, max) {
    value = +value;
    return isNaN(value) ? min : value < min ? min : value > max ? max : value;
}

class ColorPicker {
    constructor(options) {
        let container = parseElemnt(options);
        if (container) {
            // se viene passato al costrutto un elemento HTML uso le opzioni di default
            this.options = Object.assign({}, DEFAULT, { attachTo: options });
        } else {
            // altrimenti presumo che sia indicato nelle opzioni qual'è il contenitore
            this.options = Object.assign({}, DEFAULT, options);
            container = parseElemnt(this.options.attachTo);
        }

        this.H = 0;
        this.S = 0;
        this.L = 0;
        this.R = 0;
        this.G = 0;
        this.B = 0;

        if (container) {
            // creo gli elementi HTML e li aggiungo al container
            const box = document.createElement('div');
            box.className = 'a-color-picker';
            // se falsy viene nascosto .a-color-picker-rgb
            if (!this.options.showRGB) box.className += ' hide-rgb';
            // se falsy viene nascosto .a-color-picker-hsl
            if (!this.options.showHSL) box.className += ' hide-hsl';
            // se falsy viene nascosto .a-color-picker-single-input (css hex)
            if (!this.options.showHEX) box.className += ' hide-single-input';
            box.innerHTML = HTML_BOX;
            container.appendChild(box);
            // preparo il canvas con tutto lo spettro del HUE (da 0 a 360)
            // in base al valore selezionato su questo canvas verrà disegnato il canvas per SL
            const hueBar = box.querySelector('.a-color-picker-h');
            this.setupHueCanvas(hueBar);
            this.hueBarHelper = canvasHelper(hueBar);
            this.huePointer = box.querySelector('.a-color-picker-h+.a-color-picker-dot');
            // preparo il canvas per SL (saturation e luminance)
            const slBar = box.querySelector('.a-color-picker-sl');
            this.setupSlCanvas(slBar);
            this.slBarHelper = canvasHelper(slBar);
            this.slPointer = box.querySelector('.a-color-picker-sl+.a-color-picker-dot');
            // preparo il box della preview
            this.preview = box.querySelector('.a-color-picker-preview');
            this.setupClipboard(this.preview.querySelector('.a-color-picker-clipbaord'));
            // prearo gli input box
            this.setupInput(this.inputH = box.querySelector('.a-color-picker-hsl>input[name=H]'));
            this.setupInput(this.inputS = box.querySelector('.a-color-picker-hsl>input[name=S]'));
            this.setupInput(this.inputL = box.querySelector('.a-color-picker-hsl>input[name=L]'));
            this.setupInput(this.inputR = box.querySelector('.a-color-picker-rgb>input[name=R]'));
            this.setupInput(this.inputG = box.querySelector('.a-color-picker-rgb>input[name=G]'));
            this.setupInput(this.inputB = box.querySelector('.a-color-picker-rgb>input[name=B]'));
            // preparo l'input per il formato hex css
            this.setupInput(this.inputRGBHEX = box.querySelector('input[name=RGBHEX]'));
            // imposto il colore iniziale
            this.onValueChanged(COLOR, this.options.color);
        } else {
            throw `Container not found: ${this.options.attachTo}`;
        }
    }

    setupHueCanvas(canvas) {
        canvas.width = HUE_BAR_SIZE[0];
        canvas.height = HUE_BAR_SIZE[1];
        // disegno sul canvas applicando un gradiente lineare che copra tutti i possibili valori di HUE
        //  quindi ci vogliono 361 stop (da 0 a 360), mantendo fisse S e L
        const ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, HUE_BAR_SIZE[0], 0),
            step = 1 / 360;
        // aggiungo tutti i 361 step al gradiente
        for (let ii = 0; ii <= 1; ii += step) {
            gradient.addColorStop(ii, `hsl(${360 * ii}, 100%, 50%)`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, HUE_BAR_SIZE[0], HUE_BAR_SIZE[1]);
        // gestisco gli eventi per la selezione del valore e segnalo il cambiamento tramite callbak
        // una volta che il puntatore è premuto sul canvas (mousedown) 
        // intercetto le variazioni nella posizione del puntatore (mousemove)
        // relativamente al document, in modo che il puntatore in movimento possa uscire dal canvas
        // una volta sollevato (mouseup) elimino i listener
        const onMouseMove = (e) => {
            const x = limit(e.clientX - canvas.getBoundingClientRect().x, 0, HUE_BAR_SIZE[0]),
                hue = Math.round(x * 360 / HUE_BAR_SIZE[0]);
            this.huePointer.style.left = (x - 7) + 'px';
            this.onValueChanged(HUE, hue);
        };
        // mouse down sul canvas: intercetto il movimento, smetto appena il mouse viene sollevato
        canvas.addEventListener('mousedown', (e) => {
            onMouseMove(e);
            document.addEventListener('mousemove', onMouseMove);
            // il mouse up mi basta che venga intercettato solo una volta
            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', onMouseMove);
            }, { once: true });
        });
    }

    setupSlCanvas(canvas) {
        canvas.width = SL_BAR_SIZE[0];
        canvas.height = SL_BAR_SIZE[1];
        // gestisco gli eventi per la selezione del valore e segnalo il cambiamento tramite callbak
        // una volta che il puntatore è premuto sul canvas (mousedown) 
        // intercetto le variazioni nella posizione del puntatore (mousemove)
        // relativamente al document, in modo che il puntatore in movimento possa uscire dal canvas
        // una volta sollevato (mouseup) elimino i listener
        const onMouseMove = (e) => {
            const x = limit(e.clientX - canvas.getBoundingClientRect().x, 0, SL_BAR_SIZE[0] - 1),
                y = limit(e.clientY - canvas.getBoundingClientRect().y, 0, SL_BAR_SIZE[1] - 1),
                c = this.slBarHelper.grabColor(x, y);
            // console.log('grab', x, y, c)
            this.slPointer.style.left = (x - 7) + 'px';
            this.slPointer.style.top = (y - 7) + 'px';
            this.onValueChanged(RGB, c);
        };
        // mouse down sul canvas: intercetto il movimento, smetto appena il mouse viene sollevato
        canvas.addEventListener('mousedown', (e) => {
            onMouseMove(e);
            document.addEventListener('mousemove', onMouseMove);
            // il mouse up mi basta che venga intercettato solo una volta
            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', onMouseMove);
            }, { once: true });
        });
    }

    setupInput(input) {
        const min = +input.min,
            max = +input.max,
            prop = input.name;
        if (input.type === 'text') {
            input.addEventListener('change', () => {
                this.onValueChanged(prop, input.value);
            });
        } else {
            input.addEventListener('change', () => {
                const value = +input.value;
                this.onValueChanged(prop, limit(value, min, max));
            });
        }
    }

    setupClipboard(input) {
        // l'input ricopre completamente la preview ma è totalmente trasparente
        input.title = 'click to copy';
        input.addEventListener('click', e => {
            // non uso direttamente inputRGBHEX perchè potrebbe contenere un colore non valido
            input.value = rgbToHex(this.R, this.G, this.B);
            input.select();
            document.execCommand('copy');
        });
    }

    onValueChanged(prop, value) {
        // console.log(prop, value);
        switch (prop) {
            case HUE:
                this.H = value;
                [this.R, this.G, this.B] = hslToRgb(this.H, this.S, this.L);
                this.slBarHelper.setHue(value);
                this.updatePointerH(this.H);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case SATURATION:
                this.S = value;
                [this.R, this.G, this.B] = hslToRgb(this.H, this.S, this.L);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case LUMINANCE:
                this.L = value;
                [this.R, this.G, this.B] = hslToRgb(this.H, this.S, this.L);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case RED:
                this.R = value;
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case GREEN:
                this.G = value;
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case BLUE:
                this.B = value;
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case RGB:
                [this.R, this.G, this.B] = value;
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case RGB_USER:
                [this.R, this.G, this.B] = value;
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case HSL_USER:
                [this.H, this.S, this.L] = value;
                [this.R, this.G, this.B] = hslToRgb(this.H, this.S, this.L);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
            case RGBHEX:
                [this.R, this.G, this.B] = cssColorToRgb(value) || [this.R, this.G, this.B];
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                break;
            case COLOR:
                [this.R, this.G, this.B] = parseColorToRgb(value) || [0, 0, 0];
                [this.H, this.S, this.L] = rgbToHsl(this.R, this.G, this.B);
                this.slBarHelper.setHue(this.H);
                this.updatePointerH(this.H);
                this.updatePointerSL(this.H, this.S, this.L);
                this.updateInputHSL(this.H, this.S, this.L);
                this.updateInputRGB(this.R, this.G, this.B);
                this.updateInputRGBHEX(this.R, this.G, this.B);
                break;
        }
        // this.onColorChanged(this.H, this.S, this.L);
        this.onColorChanged(this.R, this.G, this.B);
    }

    onColorChanged(r, g, b) {
        this.preview.style.backgroundColor = `rgb(${r},${g},${b})`;
        this.onchange && this.onchange();
    }

    updateInputHSL(h, s, l) {
        this.inputH.value = h;
        this.inputS.value = s;
        this.inputL.value = l;
    }

    updateInputRGB(r, g, b) {
        this.inputR.value = r;
        this.inputG.value = g;
        this.inputB.value = b;
    }

    updateInputRGBHEX(r, g, b) {
        this.inputRGBHEX.value = rgbToHex(r, g, b);
    }

    updatePointerH(h) {
        const x = HUE_BAR_SIZE[0] * h / 360;
        this.huePointer.style.left = (x - 7) + 'px';
    }

    updatePointerSL(h, s, l) {
        const [r, g, b] = hslToRgb(h, s, l);
        const [x, y] = this.slBarHelper.findColor(r, g, b);
        if (x >= 0) {
            this.slPointer.style.left = (x - 7) + 'px';
            this.slPointer.style.top = (y - 7) + 'px';
        }
    }
}

/**
 * Crea il color picker.
 * Le opzioni sono:
 * - attachTo: elemento DOM al quale aggiungere il picker (default 'body')
 * - showHSL: indica se mostrare i campi per la definizione del colore in formato HSL (default true)
 * - showRGB: indica se mostrare i campi per la definizione del colore in formato RGB (default true)
 * - showHEX: indica se mostrare i campi per la definizione del colore in formato RGB HEX (default true)
 * - color: colore iniziale (default '#ff0000')
 *
 * @param      {Object}          container Un elemento HTML che andrà a contenere il picker
 * 
 * oppure
 * 
 * @param      {Object}          options  Le opzioni di creazione
 * @return     {Object}          ritorna un controller per impostare e recuperare il colore corrente del picker
 */
function createPicker(options) {
    const picker = new ColorPicker(options);
    let cbOnChange;
    return {
        get rgb() {
            return [picker.R, picker.G, picker.B];
        },

        set rgb([r, g, b]) {
            [r, g, b] = [limit(r, 0, 255), limit(g, 0, 255), limit(b, 0, 255)];
            picker.onValueChanged(RGB_USER, [r, g, b]);
        },

        get hsl() {
            return [picker.H, picker.S, picker.L];
        },

        set hsl([h, s, l]) {
            [h, s, l] = [limit(h, 0, 360), limit(s, 0, 100), limit(l, 0, 100)];
            picker.onValueChanged(HSL_USER, [h, s, l]);
        },

        get rgbhex() {
            return rgbToHex(picker.R, picker.G, picker.B);
        },

        /**
         * Ritorna il colore corrente nel formato RGB HEX.
         *
         * @return     {string}  colorre corrente (es: #ffdd00)
         */
        get color() {
            return this.rgbhex;
        },

        /**
         * Imposta il colore corrente.
         * Accetta:
         * - il nome di un colore (https://developer.mozilla.org/en-US/docs/Web/CSS/color_value)
         * - un colore espresso nel formato RGB HEX sia esteso (#ffdd00) che compatto (#fd0)
         * - un array di interi [R,G,B]
         *
         * @param      {string|array}  color   il colore
         */
        set color(color) {
            picker.onValueChanged(COLOR, color);
        },

        get onchange() {
            return cbOnChange;
        },

        set onchange(cb) {
            if (cb && typeof cb === 'function') {
                cbOnChange = cb;
                picker.onchange = () => {
                    cb(this);
                };
            } else {
                cbOnChange = null;
                picker.onchange = null;
            }
        }

    }
}

export {
    createPicker,
    parseColorToRgb
}