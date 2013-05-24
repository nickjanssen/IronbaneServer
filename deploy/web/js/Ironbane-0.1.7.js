// app.js
angular.module('IronbaneApp', [])
.constant('DEFAULT_AVATAR', '/images/noavatar.png')
.run(['User', '$rootScope', function(User, $rootScope) {
    $rootScope.currentUser = {};
    User.getCurrentUser()
        .then(function(user) {
            angular.copy(user, $rootScope.currentUser);
        });
}])
.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);

    $routeProvider
        .when('/', {
            templateUrl: '/views/home',
            controller: 'HomeCtrl'
        })
        .when('/register', {
            templateUrl: '/views/register',
            controller: 'RegisterCtrl'
        })
        .when('/login', {
            templateUrl: '/views/login',
            controller: 'LoginCtrl'
        })
        .when('/article/:articleId', {
            templateUrl: '/views/article',
            controller: 'ArticleCtrl',
            resolve: {
                ArticleData: ['Article', '$q', '$log', '$route', function(Article, $q, $log, $route) {
                    var deferred = $q.defer();

                    Article.get($route.current.params.articleId)
                        .then(function(article) {
                            // should be processed already
                            deferred.resolve(article);
                        }, function(err) {
                            // can't find such article, reject route change
                            deferred.reject(err);
                        });

                    return deferred.promise;
                }]
            }
        })
        .when('/forum', {
            templateUrl: '/views/forum',
            controller: 'ForumCtrl'
        })
        .when('/forum/:boardId', {
            templateUrl: '/views/board',
            controller: 'BoardCtrl',
            resolve: {
                ResolveData: ['Board', 'Post', '$q', '$route', function(Board, Post, $q, $route) {
                    var deferred = $q.defer(),
                        boardId = $route.current.params.boardId;

                    $q.all([Board.get(boardId), Post.getTopics(boardId)])
                        .then(function(results) {
                            deferred.resolve({board: results[0], posts: results[1]});
                        }, function(err) {
                            deferred.reject(err);
                        });

                    return deferred.promise;
                }]
            }
        })
        .when('/forum/:boardId/post', {
            templateUrl: '/views/postEdit',
            controller: 'PostEditCtrl',
            resolve: {
                BoardData: ['Board', '$route', function(Board, $route) {
                    return Board.get($route.current.params.boardId);
                }]
            }
        })
        .otherwise({redirectTo: '/'});
}]);
// article.js
angular.module('IronbaneApp')
.controller('ArticleCtrl', ['$scope', 'ArticleData', '$log', '$rootScope', function($scope, ArticleData, $log, $rootScope) {
    $scope.article = ArticleData;

    $rootScope.subTitle = $scope.article.title;

    $scope.$on('destroy', function() {
        $rootScope.subTitle = null;
    });
}]);
// board.js
angular.module('IronbaneApp')
.controller('BoardCtrl', ['$scope', 'ResolveData', '$location', function($scope, ResolveData, $location) {
    $scope.board = ResolveData.board;
    $scope.posts = ResolveData.posts;

    $scope.newTopic = function() {
        $location.path('/forum/' + $scope.board.id + '/post');
    };

}]);
// forum.js
angular.module('IronbaneApp')
.controller('ForumCtrl', ['$scope', 'ForumCategory', function($scope, ForumCategory) {
    $scope.cats = ForumCategory.getAllWithBoards();
}]);
// controllers - home.js
angular.module('IronbaneApp')
.controller('HomeCtrl', ['$scope', function($scope) {
    $scope.foo = "bar!";
}]);
angular.module('IronbaneApp')
.controller('LoginCtrl', ['$scope', 'User', '$log', '$location', function($scope, User, $log, $location) {
    $scope.loginError = false;

    $scope.login = function() {
        // clear for each attempt
        $scope.loginError = false;

        User.login($scope.username, $scope.password)
            .then(function() {
                $log.log('login success?');
                $location.path('/');
            }, function(err) {
                $log.warn('login error!', err);
                // greater detail?
                $scope.loginError = true;
            });
    };
}]);
// post.edit.js
angular.module('IronbaneApp')
.controller('PostEditCtrl', ['$scope', 'Post', 'BoardData', '$log', function($scope, Post, BoardData, $log) {
    $scope.board = BoardData;

    $scope.save = function() {
        var post = new Post({
            title: $scope.title,
            time: (new Date()).valueOf() / 1000, // convert to mysql unix_timestamp
            bbcontent: $scope.content,
            user: 1 // temp for now
        });
        $log.log('about to save post', post);
        post.$save($scope.board.id);
    };
}]);
// register.js
angular.module('IronbaneApp')
.controller('RegisterCtrl', ['$scope', '$http', '$log', function($scope, $http, $log) {
    // for now just make the request, todo: move to user service
    $scope.register = function() {
        if ($scope.registerForm.$valid) {
            $http.post('/api/user', $scope.user)
                .success(function(response) {
                    $log.log('registration success', response);
                })
                .error(function(response) {
                    $log.warn('registration error', response);
                });
        } else {
            $log.warn('form\'s not valid buddy...');
        }
    };
}]);
// markitup.js
angular.module('IronbaneApp')
.directive('markItUp', [function() {
    var bbcodeSettings = {
        previewParserPath:  '', // path to your BBCode parser
        markupSet: [
            {name:'Bold', key:'B', openWith:'[b]', closeWith:'[/b]'},
            {name:'Italic', key:'I', openWith:'[i]', closeWith:'[/i]'},
            {name:'Underline', key:'U', openWith:'[u]', closeWith:'[/u]'},
            {separator:'---------------' },
            {name:'Picture', key:'P', replaceWith:'[img][![Url]!][/img]'},
            {name:'Link', key:'L', openWith:'[url=[![Url]!]]', closeWith:'[/url]', placeHolder:'Your text to link here...'},
            {separator:'---------------' },
            {name:'Size', key:'S', openWith:'[size=[![Text size]!]]', closeWith:'[/size]',
            dropMenu :[
                {name:'Big', openWith:'[size=200]', closeWith:'[/size]' },
                {name:'Normal', openWith:'[size=100]', closeWith:'[/size]' },
                {name:'Small', openWith:'[size=50]', closeWith:'[/size]' }
            ]},
            {separator:'---------------' },
            {name:'Bulleted list', openWith:'[list]\n', closeWith:'\n[/list]'},
            {name:'Numeric list', openWith:'[list=[![Starting number]!]]\n', closeWith:'\n[/list]'},
            {name:'List item', openWith:'[*] '},
            {separator:'---------------' },
            {name:'Quotes', openWith:'[quote]', closeWith:'[/quote]'},
            {name:'Code', openWith:'[code]', closeWith:'[/code]'},
            {separator:'---------------' },
            {name:'Clean', className:"clean", replaceWith: function(markitup) { return markitup.selection.replace(/\[(.*?)\]/g, ""); } },
            {name:'Preview', className:"preview", call:'preview' }
        ]
    };

    return {
        restrict: 'AE',
        replace: true,
        template: '<textarea></textarea>',
        link: function(scope, el, attrs) {
            el.markItUp(bbcodeSettings);
        }
    };
}]);
// article.js
angular.module('IronbaneApp')
.factory('Article', ['$http', '$log', '$templateCache', function($http, $log, $templateCache) {
    var Article = function(json) {
        angular.copy(json || {}, this);
    };

    Article.get = function(id) {
        return $http.get('/api/article/' + id)
            .then(function(response) {
                var article = new Article(response.data);
                // setup a cacheUrl for template include
                article.cacheUrl = '__articleCache/' + id;
                // fake the contents in cache
                $templateCache.put(article.cacheUrl, article.body);

                return article;
            }, function(err) {
                $log.error('error retreiving article', err);
            });
    };

    return Article;
}]);
// board.js
angular.module('IronbaneApp')
.factory('ForumCategory', ['$http', 'Board', '$log', function($http, Board, $log) {
    var Category = function(json) {
        angular.copy(json || {}, this);
    };

    // get all categories by themselves
    Category.getAll = function() {
        var promise = $http.get('/api/forum/cats')
            .then(function(response) {
                var cats = response.data;
                cats.forEach(function(cat, i) {
                    cats[i] = new Category(cats[i]);
                });

                return cats;
            }, function(err) {
                $log.error('Error retreiving categories from server.', err);
            });

        return promise;
    };

    // get an array of forum categories with the boards sorted
    Category.getAllWithBoards = function() {
        var cats = [];

        return Board.getAll()
            .then(function(boards) {
                var cat = null;
                boards.forEach(function(board) {
                    if(cat === null || cat.name !== board.category) {
                        if(cat) { cats.push(cat); }
                        cat = new Category({name: board.category, id: board.forumcat, boards: []});
                    }
                    cat.boards.push(board);
                });
                // push the last cat, meow!
                cats.push(cat);

                return cats;
            });
    };

    return Category;
}])
.factory('Board', ['$log', '$http', function($log, $http) {
    var Board = function(json) {
        // update with config
        angular.copy(json || {}, this);

        // todo: fill these
        this.url = '/forum/' + this.id;

        this.postCount = 0;
        this.topicCount = 0;
    };

    // get a single board
    Board.get = function(id) {
        // cache this call, unlikely board will change during a session
        var promise = $http.get('/api/forum/' + id, {cache: true})
            .then(function(response) {
                var board = new Board(response.data);

                return board;
            }, function(err) {
                $log.error('Error getting board from server', err);
            });

        return promise;
    };

    Board.getAll = function() {
        var promise = $http.get('/api/forum').then(function(response) {
            var boards = response.data;

            boards.forEach(function(board, i) {
                boards[i] = new Board(board);
            });

            return boards;
        }, function(err) {
            $log.error('Error getting boards from server', err);
        });

        return promise;
    };

    // return all boards for a specific category
    Board.getAllByCategory = function() {

    };

    return Board;
}])
.factory('Post', ['$log', '$http', 'User', function($log, $http, User) {
    var Post = function(json) {
        angular.copy(json || {}, this);
    };

    Post.prototype.$save = function(boardId, topicId) {
        var url = '/api/forum/' + boardId + '/topics';

        // todo: topicId support

        var promise = $http.post(url, this)
            .then(function(response) {
                // update post object with id, topic_id etc...
                $log.log('success saving post!', response.data);
            }, function(err) {
                $log.error('error saving post', err);
            });

        return promise;
    };

    // get just the topics for a board
    Post.getTopics = function(boardId) {
        var promise = $http.get('/api/forum/' + boardId + '/topics')
            .then(function(response) {
                var posts = response.data;

                // upgrade objects
                posts.forEach(function(post, i) {
                    post.author = new User(post.author);
                    posts[i] = new Post(post);
                });

                return posts;
            });

        return promise;
    };

    return Post;
}]);
// user.js
angular.module('IronbaneApp')
.factory('User', ['DEFAULT_AVATAR', '$http', '$log', '$q', '$rootScope', function(DEFAULT_AVATAR, $http, $log, $q, $rootScope) {
    var User = function(json) {
        angular.copy(json || {}, this);
    };

    User.prototype.roles = [];

    // todo: make this a getter?
    User.prototype.$avatar = function() { return this.forum_avatar || DEFAULT_AVATAR; };

    User.prototype.$hasRole = function(role) {
        return this.roles.indexOf(role) >= 0;
    };

    // login user, sets currentUser
    User.login = function(username, password) {
        return $http.post('/login', {username: username, password: password})
            .then(function(response) {
                // should be new reference? hmmm
                $rootScope.currentUser = new User(response.data);
                //angular.copy(response.data, $rootScope.currentUser);

                return true;
            }, function(err) {
                //$log.log('User service login error', err);
                return $q.reject(err);
            });
    };

    // get currently signed in user if exists or guest account
    User.getCurrentUser = function() {
        var deferred = $q.defer();

        $http.get('/api/session/user')
            .then(function(response) {
                $log.log('get user success', response);

                var user = new User(response.data);
                user.authenticated = true; // todo: move to server?
                deferred.resolve(user);
            }, function(err) {
                if(err.status === 404) {
                    // this just means not logged in
                    var user = new User({
                        id: 0,
                        username: 'guest',
                        authenticated: false
                    });

                    deferred.resolve(user);
                } else {
                    //$log.error('error retreiving user session', err);
                    deferred.reject(err);
                }
            });

        return deferred.promise;
    };

    return User;
}]);