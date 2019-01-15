const path = require('path');

// package vars
let pkg = require('./package.json');

// gulp
let gulp = require('gulp');


// load all plugins in "devDependencies" into the variable $
let $ = require('gulp-load-plugins')({
  pattern: [ '*' ],
  scope: [ 'devDependencies' ]
});

let browserSync = require('browser-sync').create();


function customPlumber(errTitle) {
  return $.plumber({
    errorHandler: $.notify.onError({
      // Customizing error title
      title: errTitle || 'Error running Gulp',
      message: 'Error: <%= error.message %>',
      sound: 'Pop'
    })
  });
}

let banner = [
  '/**',
  ' * @project        <%= pkg.name %>',
  ' * @author         <%= pkg.author %>',
  ` * @copyright      Copyright (c) ${ $.moment().format('YYYY') }, <%= pkg.copyright %>`,
  ' *',
  ' */',
  ''
].join('\n');


/* ----------------- */
/* SCREEN CSS GULP TASKS
/* ----------------- */

// scss - build the scss to the build folder, including the required paths, and writing out a sourcemap
gulp.task('screenScss', () => {
  $.fancyLog(`-> Compiling screen scss: ${ pkg.paths.build.css }${pkg.vars.scssName}`);
  return gulp.src(`${pkg.paths.src.scss }${pkg.vars.scssName}`)
    .pipe(customPlumber('Error Running Sass'))
    .pipe($.sassGlob())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.sass({
      includePaths: [path.dirname(require.resolve('modularscale-sass'))]
    })
      .on('error', $.sass.logError))
    .pipe($.cached('sass_compile'))
    .pipe($.autoprefixer())
    .pipe($.sourcemaps.write('./'))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(pkg.paths.build.css));
});

// css task - combine & minimize any vendor CSS into the public css folder
gulp.task('screenCss', () => {
  $.fancyLog('-> Building screen css');
  return gulp.src(pkg.globs.distCss)
    .pipe(customPlumber('Error Running Sass'))
    .pipe($.print())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.postcss([ require(`${__dirname}/node_modules/postcss-normalize`)({ forceImport: true }) ]))
    .pipe($.concat(pkg.vars.siteCssName))
    .pipe($.cssnano({
      discardComments: {
        removeAll: true
      },
      discardDuplicates: true,
      discardEmpty: true,
      minifyFontValues: true,
      minifySelectors: true,
			zindex: false
    }))
    .pipe($.header(banner, { pkg: pkg }))
    .pipe($.sourcemaps.write('./'))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(pkg.paths.dist.css))
    .pipe($.filter('**/*.css'))
    .pipe(browserSync.reload({ stream:true }));
});

/* ----------------- */
/* PRINT CSS GULP TASKS
/* ----------------- */

// scss - build the scss to the build folder, including the required paths, and writing out a sourcemap
gulp.task('printScss', () => {
  $.fancyLog(`-> Compiling print scss into ${ pkg.paths.build.css }`);
  return gulp.src(`${pkg.paths.src.scss }print.scss`, {allowEmpty:true})
    .pipe(customPlumber('Error Running Sass'))
    .pipe($.sassGlob())
    .pipe($.sourcemaps.init({ loadMaps: true }))
		.pipe($.sass({
			includePaths: [path.dirname(require.resolve('modularscale-sass'))]
		})
				.on('error', $.sass.logError))
    .pipe($.cached('sass_compile'))
    .pipe($.autoprefixer())
    .pipe($.sourcemaps.write('./'))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(pkg.paths.build.css));
});

// css task - combine & minimize any vendor CSS into the public css folder
gulp.task('printCss', gulp.series( 'printScss', () => {
  $.fancyLog('-> Building print css');
  return gulp.src(`${pkg.globs.distPrintCss }`, {allowEmpty:true})
    .pipe(customPlumber('Error Running Sass'))
    .pipe($.newer({ dest: pkg.paths.dist.css }))
    .pipe($.print())
    .pipe($.sourcemaps.init({ loadMaps: true }))
    .pipe($.postcss([ require(`${__dirname}/node_modules/postcss-normalize`)({ forceImport: true }) ]))
    .pipe($.concat(pkg.vars.printCssName))
    .pipe($.cssnano({
      discardComments: {
        removeAll: true
      },
      discardDuplicates: true,
      discardEmpty: true,
      minifyFontValues: true,
      minifySelectors: true
    }))
    .pipe($.header(banner, { pkg: pkg }))
    .pipe($.sourcemaps.write('./'))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(pkg.paths.dist.css))
    .pipe($.filter('**/*.css'))
    .pipe(browserSync.reload({ stream:true }));
}));

/* ----------------- */
/* JS GULP TASKS
/* ----------------- */
gulp.task('eslint', () => {
  $.fancyLog('-> Linting Javascript via eslint...');
  return gulp.src(pkg.globs.babelJs)
  // default: use local linting config
    .pipe($.eslint({
      // Load a specific ESLint config
      configFile: '.eslintrc.json'
    }))
  // format ESLint results and print them to the console
    .pipe($.eslint.format());
});

gulp.task('cached-lint', () => {
  $.fancyLog('-> Linting Javascript via eslint...');
  return gulp.src([ `${pkg.paths.src.js }**/*.js`, `!${pkg.paths.src.js}/vendor/**/*.js` ])
    .pipe($.cached('eslint'))
  // Only uncached and changed files past this point
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.result((result) => {
      if (result.warningCount > 0 || result.errorCount > 0) {
        // If a file has errors/warnings remove uncache it
        delete $.cached.caches.eslint[$.path.resolve(result.filePath)];
      }
    }));
});

// babel js task - transpile our Javascript into the build directory
gulp.task('js-babel', () => {
  $.fancyLog('-> Transpiling Javascript via Babel...');
  return gulp.src(pkg.globs.babelJs)
    .pipe(customPlumber('Error Running js-babel'))
    .pipe($.newer({ dest: pkg.paths.build.js }))
  // .pipe($.concat(pkg.vars.buildJsName))
    .pipe($.babel({
      presets: [ 'env' ]
    }))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(pkg.paths.build.js));
});

// js task - minimize any distribution Javascript into the public js folder, and add our banner to it
gulp.task('js', gulp.series( 'js-babel', () => {
  $.fancyLog('-> Building js');
  return gulp.src(pkg.globs.distJs)
    .pipe(customPlumber('Error Running js'))
    .pipe($.if([ '*.js', '!*.min.js' ],
      $.newer({ dest: pkg.paths.dist.js, ext: '.min.js' }),
      $.newer({ dest: pkg.paths.dist.js })
    ))
    .pipe($.concat(pkg.vars.jsName))
    .pipe($.if([ '*.js', '!*.min.js' ],
      $.uglify()
    ))
    .pipe($.if([ '*.js', '!*.min.js' ],
      $.rename({ suffix: '.min' })
    ))
    .pipe($.header(banner, { pkg: pkg }))
    .pipe($.size({ gzip: true, showFiles: true }))
    .pipe(gulp.dest(pkg.paths.dist.js))
    .pipe($.filter('**/*.js'))
    .pipe(browserSync.reload({ stream:true }));
}));

/* ----------------- */
/* MISC GULP TASKS
/* ----------------- */

// imagemin task
gulp.task('imagemin', () => gulp.src(`${pkg.paths.dist.img }**/*.{png,jpg,jpeg,gif,svg}`)
  .pipe($.imagemin({
    progressive: true,
    interlaced: true,
    optimizationLevel: 7,
    svgoPlugins: [ { removeViewBox: false } ],
    verbose: true,
    use: []
  }))
  .pipe(gulp.dest(pkg.paths.dist.img)));

// task to convert svg to data uri
gulp.task('sassvg', () => gulp.src(`${pkg.paths.src.svg }/**/*.svg`)
  .pipe(sassvg({
    outputFolder: pkg.paths.dist.svg, // IMPORTANT: this folder needs to exist
    optimizeSvg: true // true (default) means about 25% reduction of generated file size, but 3x time for generating the _icons.scss file
  })));

// output plugin names in terminal
gulp.task('pluginOutput', () => {
  console.log($);
});

//copy html from  dev to dist
gulp.task('htmlDistCopy', function() {
	return gulp.src('assets/src/*.html')
			.pipe(gulp.dest('assets/dist'))
			.pipe(browserSync.reload({ stream:true }));
});

// Copy fonts
gulp.task('fonts', () => gulp.src(pkg.paths.src.fonts, {allowEmpty: true})
  .pipe(gulp.dest(pkg.paths.dist.fonts)));

// Copy img
gulp.task('img', () => gulp.src(pkg.paths.src.img, {allowEmpty:true})
  .pipe(gulp.dest(pkg.paths.dist.img)));

//delete dist folder
gulp.task('clean:dist', (done) => {
	$.del.sync('../dist/*', {force: true});
	done();
});

gulp.task('browsersync', (done) => {
  // to close browser tab when browserSync disconnects
  browserSync.use({
    plugin: function() { /* noop */ },
    hooks: {
      'client:js': require('fs').readFileSync('./closer.js', 'utf-8')
    }
  });

  browserSync.init({
    server: "./assets/dist",
    port: '8080',
    https: true,
    // baseDir: 'assets/dist',
    index: 'index.html',
    // Open the site in Chrome
    browser: [ 'google chrome' ]
  });
  done();
});


/* ----------------- */
/* Run TASKS
/* ----------------- */

gulp.task('screenAll', gulp.series('screenScss', 'screenCss'));

gulp.task('screenScssWatch', () => {
	gulp.watch([ `${pkg.paths.src.scss }**/*.scss`, '!print.scss' ], gulp.series('screenAll'));
});

gulp.task('printScssWatch', () => {
	gulp.watch([ `${pkg.paths.src.scss }print.scss` ], gulp.series('printCss'));
});

gulp.task('htmlCopyWatch', () => {
	gulp.watch([ `${pkg.paths.src.base }**/*.html` ], gulp.series('htmlDistCopy'));
});

gulp.task('jsLintWatch', () => {
	gulp.watch( `${pkg.paths.src.js }**/*.js`,  gulp.series('cached-lint'))
			.on('unlink', (ePath, stats) => {
				// code to execute on delete
				console.log(`${ePath} deleted - [cachedEsLint-watch]`);
				delete $.cached.caches.eslint[ePath]; // remove deleted files from cache
			});
});

gulp.task('jsWatch', () => {
	gulp.watch([ `${pkg.paths.src.js }**/*.js` ], gulp.series('js'));
});

gulp.task('fontsWatch', () => {
	gulp.watch([ pkg.paths.src.fonts ], gulp.series('fonts'));
});

gulp.task('preWatch', gulp.series(
		'htmlDistCopy',
		'screenAll',
		'printCss',
		'cached-lint',
		'js',
		'fonts',
		'img'
));

gulp.task('watching', gulp.parallel(
    'browsersync',
    'screenScssWatch',
    'printScssWatch',
    'htmlCopyWatch',
    'jsLintWatch',
    'jsWatch',
    'htmlCopyWatch',
    'fontsWatch'
));

// Default task
gulp.task('default', gulp.series('preWatch', 'watching'));


// Production build
gulp.task('build', gulp.series('clean:dist','htmlDistCopy', 'screenAll', 'printCss', 'js', 'fonts', 'img'));
