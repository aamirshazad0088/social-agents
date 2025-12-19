"""
Test Script for Content Strategist Chat API
Run this to test the production implementation
"""
import httpx
import asyncio
import json


BASE_URL = "http://localhost:8000"


async def test_health_check():
    """Test health check endpoint"""
    print("\n=== Testing Health Check ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


async def test_providers():
    """Test providers endpoint"""
    print("\n=== Testing Providers List ===")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/v1/providers")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
 return response.status_code == 200


async def test_chat_strategist():
    """Test content strategist chat"""
    print("\n=== Testing Content Strategist Chat ===")
    
    request_data = {
        "message": "I need an Instagram Reel for my new running shoes. They're lightweight with neon accents, street vibe.",
        "userId": "test-user-123",
        "threadId": None,  # Will create new thread
        "attachments": None,
        "businessContext": {
            "brandName": "RunFast",
            "brandVoice": "Energetic and inspiring",
            "targetAudience": "Urban millennials who love fitness",
            "industry": "Athletic footwear"
        },
        "modelId": None  # Will use default
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/content/strategist/chat",
            json=request_data
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if result.get("success"):
            print(f"\n✅ Chat successful!")
            print(f"Thread ID: {result.get('threadId')}")
            print(f"Content Generated: {result.get('contentGenerated')}")
            print(f"Generation Time: {result.get('generationTime')}ms")
            
            if result.get("contentGenerated"):
                contents = result.get("generatedContent", {}).get("contents", [])
                print(f"\nGenerated {len(contents)} platform(s):")
                for content in contents:
                    print(f"  - {content['platform']}: {content['title']}")
        else:
            print(f"\n❌ Chat failed: {result.get('error')}")
    
    return response.status_code == 200


async def main():
    """Run all tests"""
    print("=" * 60)
    print("Content Creator Backend - API Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test 1: Health Check
    try:
        results.append(("Health Check", await test_health_check()))
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        results.append(("Health Check", False))
    
    # Test 2: Providers
    try:
        results.append(("Providers List", await test_providers()))
    except Exception as e:
        print(f"❌ Providers test failed: {e}")
        results.append(("Providers List", False))
    
    # Test 3: Chat Strategist
    try:
        results.append(("Chat Strategist", await test_chat_strategist()))
    except Exception as e:
        print(f"❌ Chat strategist test failed: {e}")
        results.append(("Chat Strategist", False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed}/{total} tests passed")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
