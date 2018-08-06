/**
 * @author Alexandre de Freitas Caetano <https://github.com/aledefreitas>
 */

var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify-es').default;
var log = require('gulplog');
var rename = require('gulp-rename');

var environment = 'dev';

gulp.task('js', function() {
    let build = browserify(__dirname + '/index.js')
        .bundle()
        .on('error', function(err) {
            console.log(err.message);
            this.emit('end');
        })
        .pipe(source('zlx.player.js'))
        .pipe(buffer());

    if(environment === 'prod') {
        build.pipe(uglify({
            'mangle': true
        }))
    }

    build.pipe(gulp.dest(__dirname + '/dist'));

    return build;
});

gulp.task('dev', function() {
    environment = 'dev';

    gulp.watch([
        __dirname + '/src/**/*.js',
        __dirname + '/src/*.js',
        __dirname + '/index.js'
    ], {
        ignoreInitial: false,
    }, [ 'js' ]);
});

gulp.task('prod', function() {
    environment = 'prod';

    gulp.start('js');
});
