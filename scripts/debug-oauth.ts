import OAuth from "oauth-1.0a";
import crypto from "crypto";

// Load env
const config = {
   consumer: {
      key: process.env.WM_CONSUMER_TEST,
      secret: process.env.WM_CONSUMERSC_TEST,
   },
   token: {
      key: process.env.WM_TEST_ACCESS,
      secret: process.env.WM_TEST_ACCESSSC,
   },
   url: "https://test.wikipedia.org/w/api.php",
};

console.log("Debug Config:", {
   consumerKey: config.consumer.key,
   tokenKey: config.token.key,
   hasConsumerSecret: !!config.consumer.secret,
   hasTokenSecret: !!config.token.secret,
});

const oauth = new OAuth({
   consumer: {
      key: config.consumer.key || "",
      secret: config.consumer.secret || "",
   },
   signature_method: "HMAC-SHA1",
   hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64");
   },
});

async function testAuth() {
   const params = {
      action: "query",
      meta: "userinfo", // simpler than tokens
      format: "json",
   };

   const requestData = {
      url: config.url,
      method: "GET",
      data: params,
   };

   console.log("Request Data:", requestData);

   try {
      const token = {
         key: config.token.key || "",
         secret: config.token.secret || "",
      };

      // 1. HEADER AUTH
      console.log("\n--- Attempt 1: Authorization Header ---");
      const authData = oauth.authorize(requestData, token);
      const headers = oauth.toHeader(authData);
      
      const queryString = new URLSearchParams(params as any).toString();
      const fetchUrl = `${config.url}?${queryString}`;
      
      console.log("Fetching:", fetchUrl);
      const res1 = await fetch(fetchUrl, {
         headers: {
            ...headers,
            "User-Agent": "WLMAZ-Debug/1.0",
         },
      });
      console.log("Status:", res1.status);
      console.log("Body:", await res1.text());

      // 2. QUERY STRING AUTH (No Headers)
      console.log("\n--- Attempt 2: Query String Auth ---");
      // For this, we merge params + auth params into the URL
      const requestData2 = {
         url: config.url,
         method: "GET",
         data: params
      };
      
      const authData2 = oauth.authorize(requestData2, token);
      // Construct URL with ALL params (data + auth)
      const allParams = { ...params, ...authData2 };
      const qs2 = new URLSearchParams(allParams as any).toString();
      const fetchUrl2 = `${config.url}?${qs2}`;
      
      console.log("Fetching:", fetchUrl2);
      const res2 = await fetch(fetchUrl2, {
         headers: {
            "User-Agent": "WLMAZ-Debug/1.0",
         }
      });
      console.log("Status:", res2.status);
      console.log("Body:", await res2.text());

   } catch (e) {
      console.error("Error:", e);
   }
}

testAuth();
