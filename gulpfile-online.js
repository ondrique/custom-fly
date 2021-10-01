var gulp = require("gulp");

var pug = require("gulp-pug");
var changed = require("gulp-changed");
var gulpif = require("gulp-if");
var filter = require("gulp-filter");
var del = require("del");
var cdnizer = require("gulp-cdnizer");
var autoprefixer = require("gulp-autoprefixer");
var npmDist = require("gulp-npm-dist");
var rename = require("gulp-rename");
var revAll = require("gulp-rev-all");
var sass = require("gulp-sass")(require("node-sass"));
var path = require("path");

var srcMarkupFiles = "src/**/*.pug";
var srcSassFiles = "src/scss/style.*.scss";

var distMainDir = "tmp/";
var distStyleDir = "tmp/css/";

var distVendorDir = "tmp/vendor/";

var finalMainDir = "online/";

var copy = ["js/**", "img/**", "icons/**", "css/**", "fonts/**", "favicon.png"];

var config = {
    autoprefixer: {
        cascade: false,
    },
    browserSync: {
        enabled: true,
    },
    cdnizer: {
        enabled: false,
        defaultCDNBase: "",
        files: ["img/**", "vendor/**", "css/**"],
    },
    sass: {
        outputStyle: "compressed",
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
            styleSwitcher: true,
            noIndex: true,
        },
    },
};

gulp.task("clean", function () {
    return del([distMainDir + "**/*", finalMainDir + "**/*"]);
});

gulp.task("sass", function () {
    return gulp
        .src(srcSassFiles)
        .pipe(sass(config.sass).on("error", sass.logError))
        .pipe(autoprefixer(config.autoprefixer))
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

gulp.task("rev", function () {
    return gulp
        .src(distMainDir + "**")
        .pipe(
            revAll.revision({
                dontRenameFile: [
                    /^\/favicon.png$/g,
                    ".html",
                    /[a-z]*vendor\//g,
                ],
                dontUpdateReference: [
                    /^\/favicon.png$/g,
                    ".html",
                    /[a-z]*vendor\//g,
                ],
            })
        )
        .pipe(gulp.dest(finalMainDir));
});

gulp.task("cdnize", function () {
    return gulp
        .src(finalMainDir + "**/*.html")
        .pipe(gulpif(config.cdnizer.enabled, cdnizer(config.cdnizer)))
        .pipe(gulp.dest(finalMainDir));
});

gulp.task(
    "build",
    gulp.series(
        "clean",
        gulp.parallel("vendor", "pug", "sass", "copy"),
        "rev",
        "cdnize"
    )
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
