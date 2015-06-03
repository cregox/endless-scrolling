// initially based on a script from foley at
// http://answers.squarespace.com/questions/17153/how-can-i-create-an-infinite-scroll-blog-on-the-developer-platform

// this is still much based on squarespace and not fully abstracted away.

///////////////////////

// from http://stackoverflow.com/a/10939737/274502
// loadScript('https://cdnjs.cloudflare.com/ajax/libs/require.js/2.1.18/require.min.js', function() {
//   console.log('require loaded'); // but too much bureaucracy to proceed from here
// });
loadScript('https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js');
loadScript('http://cdnjs.cloudflare.com/ajax/libs/masonry/3.3.0/masonry.pkgd.min.js');
loadScript('https://cdn.rawgit.com/aFarkas/lazysizes/5b90f5591717cb1699347b69916b86b778d79fe6/lazysizes.min.js');
loadScript('https://cdn.rawgit.com/desandro/imagesloaded/c0125592020bdbbb36f7506ea41dbdebad644a45/imagesloaded.pkgd.min.js');

function endlessScrolling (config)
{
  // config
  var loadingMargin = config['loadingMargin'];
  var container = config['container'];
  var list = config['list'];
  var item = config['item'];
  var onComplete = config['onComplete'];
  var ajaxString = config['ajaxString'];
  var jsonAjax = config['jsonAjax'];

  // private
  var thumbSize = 750; //px // ideally this would be automatic and even change with resize
  var $parentToAppend;
  var $newItemToClone;
  var itemsLoaded = 0;
  var totalItemsCount = 0;// Static.SQUARESPACE_CONTEXT.collection.itemCount;
  var urlQuery = window.location.pathname;
  var stuffBottom;
  var $loadingIcon;
  var msnry;
  var createPageComplete = false;
  var layoutComplete = false;
  var initialScrollPosition;
  var pageId;
  var initialLocation;
  var currentWidth;

  initialLocation = document.location.href.split('#')[0];

  initialScrollPosition = window.scrollY;
  pageId = location.hash.slice(1);
  if ( pageId.slice(0,2) === 'p@' )
  {
    pageId = pageId.slice(2);
  }
  else
  {
    pageId = undefined;
  }

  $parentToAppend = $(container).first().find('div');
  jsonAjax(ajaxString, finishAjax);
  
  itemsLoaded = $parentToAppend.find('.summary-item-list .summary-item').length;

  $loadingIcon = $('a[href^="javascript:endlessScrollingLoading"]').first();
  $loadingIcon.find('div.image-block-wrapper').first().css({'height': 'auto'});

  // almost all styles set in this whole script need to be set here
  // to overwrite styles already set on the element before this
  $parentToAppend.find('.summary-item').css({'width': 'initial'});
  
  $loadingIcon.find('img').first().css({
    'bottom': '',
    'top': '',
    'left': '',
    'right': '',
    'width': '',
    'height': '',
    'position': ''
  }).addClass('endless-loading').parent().css({'text-align': 'center'});
  $loadingIcon.find('div.image-block-wrapper').first().css({'padding-bottom': 0});
  $(container).append($loadingIcon);
  
  $newItemToClone = $parentToAppend.find('.summary-item-list .summary-item').first().clone();
  $newItemToClone.addClass('cloned').hide();
  $parentToAppend.append($newItemToClone);
  $newItemToClone.find('img').first()
    .attr('src', '')
    .attr('data-src', '')
    .removeClass('positioned');

  $(container).first().css({
    'background-color': '#e8edf3',
    'padding': '2em'
  });

  $(window).resize();
  $parentToAppend.find('.summary-item-list').first().css({'display': 'block'}); // with style, prevented summary to appear

  $(window).resize(function()
  {
    currentWidth = $('.summary-item-list .summary-item img').first().width();
    loadMasonry();
  });

  function loadMasonry ()
  {
    var container = document.querySelector(list);
    msnry = new Masonry( container,
    {
      'transitionDuration': 0,
      'gutter': 15,
      'itemSelector': '.summary-item',
      'isInitLayout': false
    });
    
    msnry.on( 'layoutComplete', function( laidOutItems )
    {
      $loadingIcon.find('img').hide();

      if (layoutComplete) return;

      if (createPageComplete)
      {
        $parentToAppend.find('.summary-item-list .summary-item').removeClass('invisible');
        $loadingIcon.remove();
        var position = initialScrollPosition;
        var $postPage = $(item +'#'+ pageId).first();
        if ( $postPage && $postPage.offset() )
        {
          position = $postPage.offset().top;
        }
        window.scrollTo(0, position);
        layoutComplete = true;
      }
      else
      {
        resetScrollingVars();
      }
      return true; // listen to event only once
    });
    imagesLoaded( container, function()
    {
      msnry.layout();
    });
  }

  function resetScrollingVars ()
  {
    var parentChild = container + '>div';
    stuffBottom = $(parentChild).get('clientHeight') + $(parentChild).offset().top;
    
    var windowHeight = window.innerHeight
     || document.documentElement.clientHeight
     || document.body.clientHeight;
    var spaceHeight = windowHeight + window.scrollY;

    // measures distance from page top to content bottom
    // should be less than scrollY position
    if (spaceHeight + loadingMargin >= stuffBottom)
    {
      if (spaceHeight > stuffBottom)
      {
        var $img = $loadingIcon.find('img:not(.fixed)');
        if ($img) $img.addClass('fixed');
      }
      else
      {
        var $img = $loadingIcon.find('img.fixed');
        if ($img) $img.removeClass('fixed');
      }
    }
  }

  function createLayout (json)
  {
    if (json === null || createPageComplete) return false;

    $loadingIcon.find('img').show();

    for (var i = itemsLoaded; i < totalItemsCount; i++)
    {
      var $newItem = $newItemToClone.clone().show();

      var itemPageId = json.items[i].fullUrl.split('/').pop();
      $newItem
        .attr('id', itemPageId)
        .addClass('invisible')
        .removeClass('cloned');

      $parentToAppend.find('.summary-item-list').first().append($newItem);

      var imgSize = json.items[i].originalSize;
      var imgHeight = imgSize.split('x')[1];
      var imgRatio = imgSize.split('x')[0] / imgHeight;
      imgHeight = parseInt(currentWidth / imgRatio, 10);
      $newItem.find('img').first()
        .attr('style', 'height: '+ imgHeight +'px !important')
        .css({'opacity': 1})
        .addClass('lazyload')
        .attr('data-image-dimensions', '')
        .attr('data-image', json.items[i].assetUrl)
        .attr('alt', '')
        .attr('data-src', json.items[i].assetUrl +'?format='+ thumbSize +'w')
        .attr('data-srcset',
          json.items[i].assetUrl +'?format=1500w 1500w'
          +', '+ json.items[i].assetUrl +'?format=750w 750w'
          +', '+ json.items[i].assetUrl +'?format=500w 500w'
          +', '+ json.items[i].assetUrl +'?format=300w 300w'
          +', '+ json.items[i].assetUrl +'?format=100w 100w'
        )
        //.getDOMNode().src = json.items[i].assetUrl +'?format=100w'
        .on('load', function()
        {
          $(this).css({'height': ''});
        })
      ;

      $newItem.find('a').first()
        .attr('href', json.items[i].fullUrl)
        .attr('click-href', initialLocation + '#p@' + itemPageId)
        .on('click', function() {
          history.replaceState({},'', this.getAttribute('click-href'));
        });

      $newItem.find('.product-price span').first().text(
        (json.items[i].variants[0].price / 100).toFixed(2)
      );
    }

    if (onComplete !== undefined)
    {
       onComplete();
    }
    $('footer#footer').show();
    createPageComplete = true;

    return true;
  } // function createLayout
  
  function finishAjax (json)
  {
    totalItemsCount = json.items.length;

    resetScrollingVars();

    Y.one('body').simulate('resize'); // adjust items in the columns

    createLayout(json);
    loadMasonry();
  }
} // function endlessScrolling

function loadScript(url, callback)
{
  // Adding the script tag to the head as suggested before
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;

  // Then bind the event to the callback function.
  // There are several events for cross browser compatibility.
  script.onreadystatechange = callback;
  script.onload = callback;

  // Fire the loading
  head.appendChild(script);
}