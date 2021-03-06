// Include gulp
var gulp = require('gulp');

// Include plugins
//var jshint = require('gulp-jshint'); //TBD hint it so it stinks less
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var ngAnnotate = require('gulp-ng-annotate');
var del = require("del");
var bower = require("gulp-bower");

var jasmine = require('gulp-jasmine');
var karma = require('karma').server;

gulp.task('default', function () {
	return gulp.src(['src/wot.module.js','src/**/*.js'])
        .pipe(sourcemaps.init())
		.pipe(concat('angular-wot.js'))
        .pipe(ngAnnotate())
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(sourcemaps.write("./"))
		.pipe(gulp.dest('dist'));
});

gulp.task('clean', function(cb) {
  del("dist/**/*",cb);  
});

gulp.task('test', function(done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, function() {
        done();
    });
});