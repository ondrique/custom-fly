var gulp = require("gulp");

var pug = require("gulp-pug");
var changed = require("gulp-changed");
var filter = require("gulp-filter");
var del = require("del");
var autoprefixer = require("gulp-autoprefixer");
var npmDist = require("gulp-npm-dist");
var rename = require("gulp-rename");
var cleanCSS = require("gulp-clean-css");
var sourcemaps = require("gulp-sourcemaps");
var sass = require("gulp-sass")(require("node-sass"));
var path = require("path");

var srcMarkupFiles = "src/**/*.pug";
var srcSassFiles = "src/scss/style.*.scss";

var distMainDir = "distribution/";
var distStyleDir = "distribution/css/";

var distVendorDir = "distribution/vendor/";

var copy = [
    "js/**",
    "css/**",
    "img/**",
    "docs/**",
    "icons/**",
    "fonts/**",
    "favicon.png",
    "readme.txt",
    "license.txt",
    "credits.txt",
    "custom-icons/**",
];

var config = {
    autoprefixer: {
        cascade: false,
    },
    browserSync: {
        enabled: false,
    },
    sass: {
        outputStyle: "expanded",
        includePaths: ["src/scss", "src/scss/modules"],
    },
    htmlmin: {
        enabled: false,
        collapseWhitespace: true,
        removeComments: true,
        keepClosingSlash: true,
    },
    pug: {
        locals: {
            styleSwitcher: false,
        },
    },
};

gulp.task("clean", function () {
    return del([distMainDir + "**/*"]);
});

gulp.task("sass", function () {
    return gulp
        .src(srcSassFiles)
        .pipe(sourcemaps.init())
        .pipe(sass(config.sass).on("error", sass.logError))
        .pipe(autoprefixer(config.autoprefixer))
        .pipe(gulp.dest(distStyleDir))
        .pipe(cleanCSS())
        .pipe(
            rename({
                suffix: ".min",
            })
        )
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(distStyleDir));
});

gulp.task("pug", function () {
    return (
        gulp
            .src(srcMarkupFiles)

            //filter out partials (in pug includes)
            .pipe(filter(["**", "!src/_pug-includes/*"]))

            //process pug templates
            .pipe(
                pug({
                    pretty: true,
                    locals: config.pug.locals,
                })
            )

            //save all the files
            .pipe(gulp.dest(distMainDir))
    );
});

gulp.task("copy", function () {
    return (
        getFoldersSrc("src", copy)
            .pipe(changed(distMainDir))
            //save all the files
            .pipe(gulp.dest(distMainDir))
    );
});

gulp.task("vendor", function () {
    return gulp
        .src(
            npmDist({
                copyUnminified: true,
            }),
            {
                base: "./node_modules/",
            }
        )
        .pipe(
            rename(function (path) {
                path.dirname = path.dirname
                    .replace(/\/distribute/, "")
                    .replace(/\\distribute/, "")
                    .replace(/\/dist/, "")
                    .replace(/\\dist/, "");
            })
        )
        .pipe(gulp.dest(distVendorDir));
});

gulp.task(
    "build",
    gulp.series("clean", gulp.parallel("vendor", "pug", "sass", "copy"))
);

var getFoldersSrc = function (base, folders) {
    return gulp.src(
        folders.map(function (item) {
            return path.join(base, item);
        }),
        {
            base: base,
            allowEmpty: true,
        }
    );
};

var getFolders = function (base, folders) {
    return folders.map(function (item) {
        return path.join(base, item);
    });
};
