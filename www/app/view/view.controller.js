angular.module('app')
	.controller('ViewController', ['$scope', '$state', '$stateParams', '$ionicModal', '$http', '$firebaseArray', '$firebaseObject', '$cordovaCamera', 
		function($scope, $state, $stateParams, $ionicModal, $http, $firebaseArray, $firebaseObject, $cordovaCamera) {

		// Post view to server

		$scope.view = {};
		$scope.filter = {};
		$scope.types = ['Graffiti', 'Painting', 'Sculpture', 'Stencil', 'Other'];

		$scope.uploadView = function() {
			var user = firebase.auth().currentUser;
			var viewData = {
				photoURL: $scope.view.photoURL,
				user: user.displayName,
				artType: $scope.view.artType,
				description: $scope.view.description,
				timeStamp: 1-Date.now(),
				viewPosition: $scope.view.position
			},
			newPostKey = firebase.database().ref().child('views').push().key,
			updates = {};

			updates['/views/' + newPostKey] = viewData;
			firebase.database().ref().update(updates);

			$state.go('tab.views-map');
		}

		// Take View pic

		$scope.getViewPic = function () {
	
	    	var cameraOptions = {
		        quality: 75,
                destinationType: navigator.camera.DestinationType.DATA_URL,
                sourceType: navigator.camera.PictureSourceType.CAMERA,
                encodingType: navigator.camera.EncodingType.JPEG,
                allowEdit: true,
                targetWidth: 300,
                targetHeight: 300,
                saveToPhotoAlbum: false
	    	};

	    	$cordovaCamera.getPicture(cameraOptions).then(function(imageData) {
	        	$scope.view.photoURL = "data:image/jpeg;base64," + imageData;
	    	}, function(err) {
	        	console.log(err);
	    	});

	    	function success(position) {
	    		$scope.view.position = {
	    			latitude: position.coords.latitude,
	    			longitude: position.coords.longitude
	    		};
	    	}

	    	navigator.geolocation.getCurrentPosition(success);

	    }

		// Initialize Views List and allow pull to refresh

		$scope.doRefresh = function() {
		    var ref = {};

		    if ($scope.applyFilter) {
		    	ref = firebase.database().ref('views/').orderByChild('artType').equalTo($scope.applyFilter);
		    } else {
		    	ref = firebase.database().ref('views/').orderByChild('timeStamp');
		    }
			
			$scope.views = $firebaseArray(ref);
			$scope.$broadcast('scroll.refreshComplete');
		}

		// Initialize My Uploads and allow pull to refresh

		$scope.loadMyUploads = function() {
			var user = firebase.auth().currentUser;
		    var ref = firebase.database().ref('views/').orderByChild('user').equalTo(user.displayName);
			
			$scope.myUploads = $firebaseArray(ref);
			$scope.$broadcast('scroll.refreshComplete');
		}

		// Views filter modal

		$ionicModal.fromTemplateUrl('filter.html', {
		    scope: $scope,
		    animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.modal = modal;
		});

		$scope.openModal = function() {
		    $scope.modal.show();
		}

		$scope.closeModal = function() {
		    $scope.modal.hide();
		}

		$scope.saveFilter = function() {
			if ($scope.filter.type !== 'None') {
				$scope.applyFilter = $scope.filter.type;
				$scope.modal.hide();
			} else {
				$scope.applyFilter = '';
				$scope.modal.hide();
			}
		}

		// Initialize View Detail

		$scope.getDetail = function() {
			$scope.currentUser = firebase.auth().currentUser;
			var ref = firebase.database().ref('views/');

			$scope.viewDetail = $firebaseObject(ref.child($stateParams.id));
		}

		// Edit View

		$scope.newInfo = {};
		$scope.updateView = function() {
			var ref = firebase.database().ref('views/' + $stateParams.id);
			ref.update({ description: $scope.newInfo.description});
		}

		$scope.deleteView = function() {
			var ref = firebase.database().ref('views/' + $stateParams.id);
			ref.remove();
		}


		// Google Maps
		
		$scope.initMap = function() {
		    var options = {
		    	timeout: 10000,
		    	enableHighAccuracy: true
		    };

		    function success(position) {
		    	var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

		    	var mapOptions = {
		      		center: latLng,
		      		zoom: 15,
		      		mapTypeId: google.maps.MapTypeId.ROADMAP,
		      		styles: [
			            {
			              	featureType: 'all',
			              	stylers: [
			                	{ saturation: -80 }
			              	]
			            },{
			              	featureType: 'road.arterial',
			              	elementType: 'geometry',
			              	stylers: [
			                	{ hue: '#00ffee' },
			                	{ saturation: 50 }
			              	]
			            },{
			              	featureType: 'poi.business',
			              	elementType: 'labels',
			              	stylers: [
			                	{ visibility: 'off' }
			              	]
			            }
			        ]
		    	};

		    	// Draw map around current location
		    	var map = new google.maps.Map(document.getElementById("map"), mapOptions);

		    	var image = 'assets/images/me-marker.svg'
		    	var meMarker = {
			    	position: latLng,
			    	map: map,
			    	icon: image,
			    	title: 'My Position'
				};

				// Place custom marker at current location
		    	var myPosition = new google.maps.Marker(meMarker);

		    	// Place markers at each view location
		    	var ref = firebase.database().ref('views/');

		    	ref.once('value', function(snapshot) {
		    		var viewsObject = snapshot.val();

		    		for (view in viewsObject) (function(view) {

		    			// avoids prototype property in viewsObject
					  	if (viewsObject.hasOwnProperty(view)) {
					    	var latLng = new google.maps.LatLng(viewsObject[view].viewPosition.latitude, viewsObject[view].viewPosition.longitude);
							var markerOptions = {
						    	position: latLng,
						    	map: map,
						    	animation: google.maps.Animation.DROP,
						    	title: 'View Position'
							};

							var viewMarker = new google.maps.Marker(markerOptions);
							viewMarker.infowindow = new google.maps.InfoWindow();

							viewMarker.addListener('click', function() {
								this.infowindow.setContent('<img src="' + viewsObject[view].photoURL + '" style="width:150px; height:150px"><br><strong>' + viewsObject[view].description + '</strong>');
								this.infowindow.open(map, viewMarker);
							});
					  	}
					})(view);

		    	});

		    };

		    function error(err) {
		    	console.log(err.message);
		    };

		    navigator.geolocation.getCurrentPosition(success, error, options);

		}
		
	}]);