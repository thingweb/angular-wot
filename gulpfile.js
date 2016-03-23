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

gulp.task('default', function () {
	return gulp.src('src/**/*.js')
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