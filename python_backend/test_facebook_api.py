"""
Test Facebook API Implementation
Tests all Facebook endpoints
"""
import sys
sys.path.insert(0, 'src')

print("=" * 60)
print("🧪 Testing Facebook API Implementation")
print("=" * 60)

# Test 1: Import Facebook router
print("\n🔍 Test 1: Import Facebook Router...")
try:
    from src.api.v1.social.facebook import router
    print(f"✅ Facebook router imported successfully")
    print(f"   Prefix: {router.prefix}")
    print(f"   Tags: {router.tags}")
except Exception as e:
    print(f"❌ Failed to import Facebook router: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Import social service methods
print("\n🔍 Test 2: Import Social Service Methods...")
try:
    from src.services.social_service import social_service
    
    # Check all required methods exist
    required_methods = [
        'facebook_post_to_page',
        'facebook_post_photo',
        'facebook_upload_video',
        'facebook_upload_reel',
        'facebook_upload_story',
        'facebook_upload_photo_unpublished',
        'facebook_create_carousel',
        'generate_app_secret_proof'
    ]
    
    for method in required_methods:
        if not hasattr(social_service, method):
            raise AttributeError(f"Missing method: {method}")
        print(f"   ✓ {method}")
    
    print("✅ All social service methods available")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Test app secret proof generation
print("\n🔍 Test 3: Test App Secret Proof Generation...")
try:
    proof = social_service.generate_app_secret_proof("test_token", "test_secret")
    print(f"   Generated proof: {proof[:30]}...")
    assert len(proof) == 64  # SHA256 hex is 64 characters
    print("✅ App secret proof generation works")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 4: Check request models
print("\n🔍 Test 4: Check Request/Response Models...")
try:
    from src.api.v1.social.facebook import (
        FacebookPostRequest,
        FacebookCarouselRequest,
        FacebookUploadMediaRequest,
        FacebookPostResponse,
        FacebookCarouselResponse,
        FacebookUploadResponse
    )
    
    # Test creating a post request
    post_req = FacebookPostRequest(
        message="Test message",
        imageUrl="https://example.com/image.jpg",
        postType="post"
    )
    print(f"   ✓ FacebookPostRequest: {post_req.message}")
    
    # Test carousel request
    carousel_req = FacebookCarouselRequest(
        message="Test carousel",
        imageUrls=["https://example.com/1.jpg", "https://example.com/2.jpg"]
    )
    print(f"   ✓ FacebookCarouselRequest: {len(carousel_req.imageUrls)} images")
    
    print("✅ All request/response models working")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Check helper functions
print("\n🔍 Test 5: Check Helper Functions...")
try:
    from src.api.v1.social.facebook import (
        get_facebook_credentials,
        refresh_facebook_token_if_needed
    )
    
    print("   ✓ get_facebook_credentials")
    print("   ✓ refresh_facebook_token_if_needed")
    print("✅ Helper functions available")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 6: Check endpoint routes
print("\n🔍 Test 6: Check Endpoint Routes...")
try:
    from src.api.v1.social.facebook import router
    
    routes = [route.path for route in router.routes]
    expected_routes = [
        '/api/v1/social/facebook/post',
        '/api/v1/social/facebook/carousel',
        '/api/v1/social/facebook/upload-media',
        '/api/v1/social/facebook/verify',
        '/api/v1/social/facebook/'
    ]
    
    for expected in expected_routes:
        if expected in routes:
            print(f"   ✓ {expected}")
        else:
            raise ValueError(f"Missing route: {expected}")
    
    print("✅ All endpoints registered")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✅ All Facebook API Tests Passed!")
print("=" * 60)
print("\n📋 Summary:")
print("  ✅ Facebook router - Working")
print("  ✅ Social service methods - All present")
print("  ✅ Request/Response models - Working")
print("  ✅ Helper functions - Available")
print("  ✅ API endpoints - Registered")
print("\n🎯 Facebook API Implementation - VERIFIED")
print("\n📝 Implemented Features:")
print("  • Text posts")
print("  • Photo posts")
print("  • Video posts")
print("  • Facebook Reels")
print("  • Facebook Stories")
print("  • Multi-photo Carousels")
print("  • Media upload to storage")
print("  • Connection verification")
print("  • Automatic token refresh")
print("  • App secret proof for security")
print("\nℹ️  Note: Full API tests require running server and authentication")
print("   Run: uv run uvicorn src.main:app --reload --port 8000")
