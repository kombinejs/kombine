const browserify = require('browserify');
const fs = require('fs');
const b = browserify();
const cheerio = require('cheerio');
const Base64 = require('js-base64').Base64;
const uglifycss = require('uglifycss');
const htmlMinify = require('html-minifier').minify;
const stringUtil = require('node7js-utils').string;
const debug = require('node7js-console-utils').debug;
const path = require('path');
const getDirName = path.dirname;
const getBaseName = path.basename;
const md5 = require('md5');
const argv = require('yargs').argv
const appRoot = require('app-root-path');
const kompress = require('kompress');




// if (require.main === module) { //called directly

//     if (argv.all) {
//         buildAllPages();
//     }
//     else if (argv.page) {
//         buildPage(argv.page)
//     }
//     else {
//         debug.logError('[ERROR] wrong argument... [ --all | --page="page_name" ]');
//     }

// } else { //required as a module
//     //do nothing
// }





// function buildAllPages() {
//     let pageList = config.PageBuilder.pageList;
//     pageList.forEach(item => buildPage(item));
// }

// function buildPage(page) {
//     if (page) {
//         debug.log('===================================================');
//         debug.log(`Start building page: ${page} ...`);
//         let view = buildView(page);
//         buildJS(page, view);
//     }
// }

// module.exports = {
//     buildAllPages: buildAllPages,
//     buildPage: buildPage,
// }

function build(pagePath, options = {}) {
    if (pagePath) {
        debug.log('===================================================');
        debug.log(`Start building page: ${pagePath} ...`);
        let view = buildView(pagePath);
        buildJS(pagePath, view, options);
    }
}

module.exports = {
    build: build,
}

//------------------------------------------------------------------------------------

function buildJS(pagePath, view, options) {
    if (fs.existsSync(`${pagePath}/main.js`)) {

        //generate main.temp.js
        let mainJS = fs.readFileSync(`${pagePath}/main.js`, 'utf8');
        let importComponentCode = '';
        for (let i = 0; i < view.componentList.length; i++) {
            let filePath = view.componentList[i] + '.js';
            if (fs.existsSync(`${filePath}`)) {
                // console.log(`${page} === ${filePath}`);
                let relativeFilePath = './' + path.relative(`${pagePath}`, filePath);
                relativeFilePath = stringUtil.replaceAll(relativeFilePath, '\\', '/');
                // console.log(relativeFilePath);
                importComponentCode += `require('${relativeFilePath}'); `;
            }
            else {
                debug.logWarning(`[WARNING] view/component does not has script (${view.componentList[i]})`);
            }
        }
        // let tempMainJS = stringUtil.replaceAll(mainJS, '//@BUILD(import components)', importComponentCode);
        let tempMainJS = mainJS + '\n' + importComponentCode;
        fs.writeFileSync(`${pagePath}/main.temp.js`, tempMainJS, 'utf8');



        b.add(`${pagePath}/main.temp.js`);
        // b.bundle().pipe(fs.createWriteStream(`${page}/main.bundle.js`));
        b.bundle(function (err, buf) {
            if (err) throw err;
            let js = buf.toString();

            let extJs = '';
            for (var key in view.externalFile.js) {
                extJs += view.externalFile.js[key] + '\n';
            }

            // js = `document.write('<style> '+window.atob('${Base64.btoa(view.css)}')+' </style>'); document.write(window.atob('${Base64.btoa(view.html)}')); ` + js;
            // js = `document.write(window.atob('${Base64.btoa('<style> ' + view.css + ' </style> ' + view.html)}')); ` + js;
            js = `document.write(\`<style> ${view.css} </style> ${view.html}\`); \n setTimeout(() => { ${extJs + js} }, 10);`;
            fs.writeFileSync(`${pagePath}/main.bundle.js`, js, 'utf8');
            fs.unlinkSync(`${pagePath}/main.temp.js`);

            if (options.minified) {
                kompress(`${pagePath}/main.bundle.js`, `${pagePath}/main.bundle.js`);
            }

            debug.log(`[✔️ DONE]`, '#00FF00');
            debug.log('===================================================\n\n');
        });
    }
}

function buildView(pagePath) {

    let componentList = [];
    let templateHashList = [];
    let externalFile = {
        css: {},
        js: {},
    }

    if (fs.existsSync(`${pagePath}/main.html`)) {
        let htmlFilePath = `${pagePath}/main.html`;
        let html = buildHtml(getDirName(htmlFilePath), fs.readFileSync(`${htmlFilePath}`, 'utf8'), componentList, templateHashList, externalFile);

        let $ = cheerio.load(html, {
            xml: {
                xmlMode: false,
            }
        });

        //external link
        let cssLinks = [];
        $('link[href]').each(function () {
            let href = $(this).attr('href');
            if (cssLinks.includes(href)) {
                $(this).remove();
            }
            else {
                cssLinks.push(href);
            }
        });
        let jsLinks = [];
        $('script[src]').each(function () {
            let src = $(this).attr('src');
            if (jsLinks.includes(src)) {
                $(this).remove();
            }
            else {
                jsLinks.push(src);
            }
        });


        //css
        let css = '';
        for (var key in externalFile.css) {
            css += externalFile.css[key] + '\n';
        }
        $('style').each(function () {
            css = $(this).html() + '\n' + css;
        });
        css = uglifycss.processString(css)
        $('style').remove();


        //html
        html = $('body').html();
        html = htmlMinify(html, {
            collapseWhitespace: true,
            removeComments: true,
        });


        //comment template
        // $ = cheerio.load(html);
        // $('template').each(function () {
        //     $(this).html(`<!-- ${$(this).html()} -->`);
        // });
        // html = $('body').html();


        //check duplicate id
        let idList = [];
        $('[id]').each(function () {
            let id = $(this).attr('id');
            if (idList.includes(id)) {
                debug.logWarning(`[WARNING] duplicate element id (${id})`);
            }
            else {
                idList.push(id);
            }
        });


        // console.log((html));
        // console.log('--------------------------------------------------------------------');
        // console.log((css));
        return {
            html: html,
            css: css,
            componentList: componentList,
            externalFile: externalFile,
        };
    }
    else {
        debug.logError(`[ERROR] page not exists ...`);
        throw new Error(`[ERROR] page not exists ...`);

        return {
            html: '',
            css: '',
            componentList: [],
            externalFile: externalFile,
        };
    }
}




function buildHtml(parentPath, html, componentList, templateHashList, externalFile) {
    let $ = cheerio.load(html, {
        xml: {
            xmlMode: false,
        }
    });
    // $('view').replaceWith($('view').html());
    $('view:not([src])').replaceWith($('view').html());
    if ($('view[src]').length || $('component[src]').length) {
        $('view[src], component[src]').each(function () {

            let src = $(this).attr('src');

            let filePath = src;
            if (src.startsWith('.')) {
                filePath = `${parentPath}/${filePath}`;
            }
            else if (src.startsWith('/')) {
                filePath = `${appRoot}${filePath}`;
            }
            filePath = resolvePath(filePath);
            let filePathWithoutExtension = filePath.split('.').slice(0, -1).join('.');
            // console.log(getPathFromPageRoot(filePath));

            if (!componentList.includes(filePathWithoutExtension))
                componentList.push(filePathWithoutExtension);
            else {
                debug.logError(`[ERROR] duplicated component (${filePath})`);
                throw new Error(`[ERROR] duplicated component (${filePath})`);
            }

            $(this).replaceWith(buildHtml(getDirName(filePath), fs.readFileSync(`${filePath}`, 'utf8'), componentList, templateHashList, externalFile));
        });
        // return $('body').html();
    }
    // else {
    //     return $('body').html();
    //     return html;
    // }



    $('style[src]').each(function () {
        let src = $(this).attr('src');

        let filePath = src;
        if (src.startsWith('.')) {
            filePath = `${parentPath}/${filePath}`;
        }

        if (fs.existsSync(`${filePath}`)) {
            let cssContent = fs.readFileSync(`${filePath}`, 'utf8');
            let hash = md5(cssContent);
            externalFile.css[hash] = cssContent;
        }
        else {
            if (!$(this).attr('optional')) {
                throw new Error(`[ERROR] file not exists (${filePath})`);
            }
        }

        $(this).remove();
    });

    $('javascript[src]').each(function () {
        let src = $(this).attr('src');

        let filePath = src;
        if (src.startsWith('.')) {
            filePath = `${parentPath}/${filePath}`;
        }
        
        if (fs.existsSync(`${filePath}`)) {
            let jsContent = fs.readFileSync(`${filePath}`, 'utf8');
            let hash = md5(jsContent);
            externalFile.js[hash] = jsContent;
        }
        else {
            if (!$(this).attr('optional')) {
                throw new Error(`[ERROR] file not exists (${filePath})`);
            }
        }

        $(this).remove();
    });




    if ($('template[src]').length) {
        $('template[src]').each(function () {
            let src = $(this).attr('src');

            let filePath = src;
            if (src.startsWith('.')) {
                filePath = `${parentPath}/${filePath}`;
            }

            let templateContent = fs.readFileSync(`${filePath}`, 'utf8');
            let hash = md5(templateContent);
            if (!templateHashList.includes(hash)) {
                templateHashList.push(hash);
                $(this).replaceWith(templateContent);
            }
            else {
                $(this).remove();
                console.log(`[AUTO-FIXED] duplicated template (${resolvePath(filePath)})`);
            }


            $('style[src]').each(function () {
                let src = $(this).attr('src');

                let cssFilePath = src;
                if (src.startsWith('.')) {
                    cssFilePath = `${getDirName(filePath)}/${cssFilePath}`;
                }

                if (fs.existsSync(`${cssFilePath}`)) {
                    let cssContent = fs.readFileSync(`${cssFilePath}`, 'utf8');
                    let hash = md5(cssContent);
                    externalFile.css[hash] = cssContent;
                }
                else {
                    if (!$(this).attr('optional')) {
                        throw new Error(`[ERROR] file not exists (${cssFilePath})`);
                    }
                }

                $(this).remove();
            });


            $('javascript[src]').each(function () {
                let src = $(this).attr('src');

                let jsFilePath = src;
                if (src.startsWith('.')) {
                    jsFilePath = `${getDirName(filePath)}/${jsFilePath}`;
                }

                if (fs.existsSync(`${jsFilePath}`)) {
                    let jsContent = fs.readFileSync(`${jsFilePath}`, 'utf8');
                    let hash = md5(jsContent);
                    externalFile.js[hash] = jsContent;
                }
                else {
                    if (!$(this).attr('optional')) {
                        throw new Error(`[ERROR] file not exists (${jsFilePath})`);
                    }
                }

                $(this).remove();
            });
        });
    }

    return $('body').html();
}

function resolvePath(filePath) {
    // console.log(filePath);
    // console.log(_pageRoot+'/'+filePath);
    // console.log(path.resolve(_pageRoot+'/'+filePath));
    // console.log('=======')
    return path.resolve(filePath);
    // return stringUtil.replaceAll(stringUtil.replaceAll(path.resolve(__dirname, filePath), __dirname, ''), '\\', '/').substr(1);
}