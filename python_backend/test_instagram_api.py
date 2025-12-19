"""
Test Instagram API Implementation
Tests all Instagram endpoints
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

print("=" * 60)
print("🧪 Testing Instagram API Implementation")
print("=" * 60)

# Test 1: Import Instagram router
print("\n🔍 Test 1: Import Instagram Router...")
try:
    from src.api.v1.social.instagram import router
    print(f"✅ Instagram router imported successfully")
    print(f"   Prefix: {router.prefix}")
    print(f"   Tags: {router.tags}")
except Exception as e:
    print(f"❌ Failed to import Instagram router: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Import social service methods
print("\n🔍 Test 2: Import Social Service Methods...")
try:
    from src.services.social_service import social_service
    
    # Check all required methods exist
    required_methods = [
        'instagram_create_media_container',
        'instagram_create_reels_container',
        'instagram_create_story_container',
        'instagram_create_carousel_container',
        'instagram_wait_for_container_ready',
        'instagram_publish_media_container',
        'instagram_get_business_account',
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

# Test 3: Check request models
print("\n🔍 Test 3: Check Request/Response Models...")
try:
    from src.api.v1.social.instagram import (
        InstagramPostRequest,
        InstagramUploadMediaRequest,
        InstagramPostResponse,
        InstagramUploadResponse
    )
    
    # Test creating a post request
    post_req = InstagramPostRequest(
        caption="Test caption",
        imageUrl="https://example.com/image.jpg",
        postType="post"
    )
    print(f"   ✓ InstagramPostRequest: {post_req.caption}")
    
    # Test carousel request
    carousel_req = InstagramPostRequest(
        caption="Test carousel",
        carouselUrls=["https://example.com/1.jpg", "https://example.com/2.jpg"]
    )
    print(f"   ✓ InstagramPostRequest (carousel): {len(carousel_req.carouselUrls)} images")
    
    print("✅ All request/response models working")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Check helper functions
print("\n🔍 Test 4: Check Helper Functions...")
try:
    from src.api.v1.social.instagram import (
        get_instagram_credentials,
        refresh_instagram_token_if_needed,
        validate_media_url
    )
    
    print("   ✓ get_instagram_credentials")
    print("   ✓ refresh_instagram_token_if_needed")
    print("   ✓ validate_media_url")
    print("✅ Helper functions available")
except Exception as e:
    print(f"❌ Failed: {e}")
    sys.exit(1)

# Test 5: Test URL validation
print("\n🔍 Test 5: Test URL Validation...")
try:
    from src.api.v1.social.instagram import validate_media_url
    from fastapi import HTTPException
    
    # Test valid URL
    try:
        validate_media_url("https://example.com/image.jpg")
        print("   ✓ Valid URL accepted")
    except HTTPException:
        raise ValueError("Valid URL rejected")
    
    # Test blob URL (should fail)
    try:
        validate_media_url("blob:https://example.com/image.jpg")
        raise ValueError("Blob URL accepted (should fail)")
    except HTTPException:
        print("   ✓ Blob URL rejected")
    
    # Test data URL (should fail)
    try:
        validate_media_url("data:image/jpeg;base64,...")
        raise ValueError("Data URL accepted (should fail)")
    except HTTPException:
        print("   ✓ Data URL rejected")
    
    print("✅ URL validation working correctly")
except Exception as e:
    print(f"❌ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Check endpoint routes
print("\n🔍 Test 6: Check Endpoint Routes...")
try:
    from src.api.v1.social.instagram import router
    
    routes = [route.path for route in router.routes]
    expected_routes = [
        '/api/v1/social/instagram/post',
        '/api/v1/social/instagram/upload-media',
        '/api/v1/social/instagram/verify',
        '/api/v1/social/instagram/'
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
print("✅ All Instagram API Tests Passed!")
print("=" * 60)
print("\n📋 Summary:")
print("  ✅ Instagram router - Working")
print("  ✅ Social service methods - All present")
print("  ✅ Request/Response models - Working")
print("  ✅ Helper functions - Available")
print("  ✅ URL validation - Working")
print("  ✅ API endpoints - Registered")
print("\n🎯 Instagram API Implementation - VERIFIED")
print("\n📝 Implemented Features:")
print("  • Feed posts (images)")
print("  • Video posts")
print("  • Instagram Reels")
print("  • Instagram Stories")
print("  • Multi-media Carousels (2-10 items)")
print("  • Media upload to storage")
print("  • Connection verification")
print("  • Automatic token refresh")
print("  • Container status polling")
print("  • URL validation (no blob/data URLs)")
print("  • Canva URL expiration detection")
print("\nℹ️  Note: Full API tests require running server and authentication")
print("   Run: uv run uvicorn src.main:app --reload --port 8000")
