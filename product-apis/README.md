# Product APIs

The goal of this problem is to create a backend application that provides various API endpoints for product data management.

You can build your backend with any platform of your choice. You are also free to use any framework/libraries of your choice for your platform of choice.

Please include documentation (in a file called `SETUP.md`) on any prerequisites we would need to have installed to run your application.

## API Structure

Each step should be its own API endpoint called `/step1`, `/step2`, etc. This is a backend exercise that will involve writing a whole bunch of APIs. You should define one API per new step.

For the first several steps, your job is just to write the APIs by calling the given API endpoints.

> [!WARNING]
> After each step, you need to check in your code on Github. Checking in all steps in the code at the very end fails sometimes.

Please go step by step when creating each of these APIs since each step is designed to be tougher than the next. Chances are high that you may not be able to complete all the steps due to time constraints.
Please note that as each step progresses, the instructions become more open-ended. This is intentional to assess your ability to make appropriate assumptions and design decisions.

## Step 1: Return a List of Product Data
For the first step, please create an API endpoint called `/step1` that calls the [following API](http://interview.surya-digital.in/get-electronics). This API returns a list of product data for electronics items. The keys and values for each item should be self-explanatory. Your `/step1` endpoint should call this API and return the response in the following JSON structure:

```
product_id: [ID_FROM_API_HERE],
product_name: [NAME_FROM_API_HERE],
brand_name: [BRAND_FROM_API_HERE],
category_name: [CATEGORY_FROM_API_HERE],
description_text: [DESCRIPTION_FROM_API_HERE],
price: [PRICE_FROM_API_HERE],
currency: [CURRENCY_FROM_API_HERE],
processor: [PROCESSOR_FROM_API_HERE],
memory: [MEMORY_FROM_API_HERE],
release_date: [RELEASE_DATE_FROM_API_HERE],
average_rating: [AVERAGE_RATING_FROM_API_HERE],
rating_count: [RATING_COUNT_FROM_API_HERE],
```

**Requirements:**
- Follow the exact casing shown in the response structure above
- Return only the fields listed above, no additional fields
- Handle null values by passing them as null back to the API caller
- Filter out any malformed or error items from the response
- All values for the keys in the JSON structure above have to be in the same structure as you receive them from the API. For example the release date field in the response of the get electronics API you call is returned in the format `"2024-08-07"`. In your API's response please return the date in the same format.

All required fields are available in the JSON response from the external API. 

**Important:** While most items in the response follow a similar structure of key-value pairs, there may intentionally be some values in the response that are outright errors. Ensure that when such errors are encountered, you are able to discard such faulty items in the JSON response.

## Step 2: Add Release Date Filters

For the second step, please create an API endpoint called `/step2` that extends the functionality from Step 1 by adding date filtering capabilities. This endpoint should accept optional query parameters `release_date_start` and `release_date_end`. Note that the date filters are inclusive of both dates.

**API Usage Examples:**

- `/step2?release_date_start=2025-01-31&release_date_end=2025-03-18`: Returns all products whose release date is between 31 January and 18 March, 2025 (inclusive of both dates)
- `/step2?release_date_start=2024-12-19`: Returns all products whose release date is on or after 19th December, 2024
- `/step2?release_date_end=2025-02-10`: Returns all products released on or before 10th February 2025
- `/step2`: Returns all products exactly the same way as the `/step1` API from the previous step

**Requirements:**
- Use the same JSON response structure as Step 1
- Handle query parameter errors (such as incorrect date formats, etc.) with a 400 status code and descriptive error message
- Both query parameters are optional and can be used independently
- If there are no items found in the response for a given date filter range, return an empty array to the caller

## Step 3: Add Brand Filters

For the third step, please create an API endpoint called `/step3` that extends the functionality from Step 2 by adding brand filtering capabilities. This endpoint should accept a `brands` query parameter containing comma-separated brand names.

**API Usage Examples:**

- `/step3?brands=Quantum`: Returns all products that belong to the brand Quantum
- `/step3?brands=Quantum,Stellar`: Returns all products that belong to either the brand Quantum or Stellar
- `/step3?brands=Quantum,Stellar,BadValue`: Returns the same response as the previous call since "BadValue" is not a valid brand in the response
- `/step3?brands=Quantum,Aura&release_date_start=2024-12-19`: Returns all products whose release date is on or after 19th December, 2024 and belong to either the brand Quantum or Aura
- `/step3`: Returns all products exactly the same way as the `/step1` API from the previous step

**Requirements:**
- Use the same JSON response structure as Step 1
- Brand filters should work in combination with the release date filters from Step 2
- Handle query parameter errors with a 400 status code and descriptive error message
- The `brands` parameter is optional and can be used independently
- If no items are found for the given filters, return an empty array

## Step 4: Pagination

For the fourth step, please create an API endpoint called `/step4` that extends the functionality from Step 3 by adding pagination capabilities. This endpoint should accept mandatory query parameters `page_size` and `page_number`.

**API Usage Examples:**

- `/step4?page_size=10&page_number=1`: Returns the first 10 products with all filtering capabilities from previous steps
- `/step4?page_size=5&page_number=2&brands=Quantum`: Returns the second page of 5 products that belong to the brand Quantum
- `/step4?page_size=20&page_number=1&release_date_start=2024-12-19&brands=Quantum,Stellar`: Returns the first 20 products whose release date is on or after 19th December, 2024 and belong to either Quantum or Stellar brands

**Requirements:**
- Use the same JSON response structure as Step 1
- Include all filtering capabilities from Steps 1, 2, and 3 (date filters and brand filters)
- Both `page_size` and `page_number` parameters are mandatory
- Handle query parameter errors with a 400 status code and descriptive error message
- If the requested page number exceeds available data, return an empty array
- Page numbers should start from 1 (not 0)

## Step 5: Joining the Response of Two APIs

For the fifth step, please create an API endpoint called `/step5` that extends the functionality from Step 4 by merging data from two different APIs. This endpoint should call both the original electronics API and the [brands API](http://interview.surya-digital.in/get-electronics-brands).

**API Integration:**
- Call both `get-electronics` and `get-electronics-brands` APIs
- Merge the responses using brand name as the unique identifier
- Include all filtering and pagination capabilities from previous steps

**Response Structure:**
Your endpoint should return the response in the following JSON format:

```json
[
    {
        "product_id": "[ID_FROM_API_HERE]",
        "product_name": "[NAME_FROM_API_HERE]",
        "brand": {
            "name": "[NAME_FROM_API_HERE]",
            "year_founded": "[YEAR_FOUNDED_FROM_API_HERE]",
            "company_age": "[Calculated as the number of years since `year_founded` till today]",
            "address": "[Single String containing street, city, state, postal code, and country from the `address` field of the response. Example: 123 Innovation Drive, Sanjose, California, 95113, USA]"
        },
        "category_name": "[CATEGORY_FROM_API_HERE]",
        "description_text": "[DESCRIPTION_FROM_API_HERE]",
        "price": "[PRICE_FROM_API_HERE]",
        "currency": "[CURRENCY_FROM_API_HERE]",
        "processor": "[PROCESSOR_FROM_API_HERE]",
        "memory": "[MEMORY_FROM_API_HERE]",
        "release_date": "[RELEASE_DATE_FROM_API_HERE]",
        "average_rating": "[AVERAGE_RATING_FROM_API_HERE]",
        "rating_count": "[RATING_COUNT_FROM_API_HERE]"
    }, 
    ...
]
```

**Requirements:**
- Include all functionality from Steps 1-4 (filtering, pagination, etc.)
- Use brand name as the unique identifier to merge data from both APIs
- Create the brand object by calling the brands API and matching by brand name
- Combine address fields from the brands API into a single string format
- Calculate company age based on the year founded
- Handle any errors from either API gracefully

## Step 6: Use a SQLite Database

For the sixth step, please create an API endpoint called `/step6` that uses SQLite to store and retrieve electronics product data instead of calling external APIs. This step involves setting up a database with the right table structure and seed data.

**Important**: Make sure that all other Endpoints defined so far (`/step1` till `/step5`) continue to work as is. The database reads should only happen for the endpoint you are defining in this step.

**Database Requirements:**

- Create a database with tables to map the electronics product data structure. Include migration scripts needed to create these tables at the time of evaluation
- Design tables that can accommodate all the fields from the previous response structure
- Ensure proper relationships between tables in order to achieve the expected API response
- Include seed data in the database to populate initial records. Provide scripts that can be run to insert the seed data so that your project can be tested while doing the assessment

**API Functionality:**
- Return data from the database instead of calling external APIs
- Maintain the same JSON response structure as Step 5. **Note again that all query parameters defined so far should work for this endpoint as well**
- Include all filtering and pagination capabilities from previous steps
- Handle database queries efficiently

**Requirements:**
- Use the same JSON response structure as Step 5
- Include all functionality from Steps 1-5 (filtering, pagination, etc.)
- Create appropriate database schema for products and brands
- Populate database with meaningful seed data
- Handle database connection errors gracefully

## Step 7: Implement CRUD APIs

For the seventh step, please create three new API endpoints that implement Create, Read, Update, and Delete (CRUD) operations on the database you set up in Step 6. These endpoints should only interact with the database data and not call external APIs.

**API Endpoints:**

- **POST** `/step7/create`: Create a new product record in the database
- **PUT** `/step7/update/{product_id}`: Update an existing product record
- **DELETE** `/step7/delete/{product_id}`: Delete a product record from the database

**Request Structure:**
The JSON request body for create and update operations should follow the same structure as the response from previous steps:

**Note:** For create operations, `product_id` should be auto-generated by the system. For update operations, `product_id` should be provided in the URL path.

```json
{
    "product_name": "Sample Product",
    "brand": {
        "name": "Sample Brand",
        "year_founded": "2020",
        "company_age": "4",
        "address": "123 Sample Street, Sample City, Sample State, 12345, Sample Country"
    },
    "category_name": "Electronics",
    "description_text": "Sample description",
    "price": "999.99",
    "currency": "USD",
    "processor": "Sample Processor",
    "memory": "16GB",
    "release_date": "2024-01-15",
    "average_rating": "4.5",
    "rating_count": "100"
}
```

**Requirements:**
- Validate all input data and return appropriate error messages for invalid values
- Handle database operations gracefully with proper error responses
- Return appropriate HTTP status codes (201 for create, 200 for update, 204 for delete)
- Ensure data integrity and referential constraints
- Include proper validation for required fields and data types

## Step 8: Return an Excel File

For this step, please return an Excel file from a new endpoint called `/step8`. Note that the Excel file returned must be in the `.xlsx` format.
In the Excel file there should be two sheets: Electronics, and Brands. The Excel file would look like this:

![Excel Sheet Illustration](Excel%20Sheet%20Illustration.png)

In the Electronics sheet, please include all the values returned form the `get-electronics` API. Each property is a column in the Excel sheet, and each item of the response is a row.
Similarly, the Brands sheet should include all the values returned from the `get-electronics-brands` API.

Here, since there is nested JSON in the response, you will need to find a way to write the nested JSON for `address` into a flat list of columns in the Brands sheet. As an example, if the JSON structure looks like this:

```json
...
"owner": "Jane Doe",
"address": {
    ...
    "street": "123 Innovation Drive",
    "city": "San Jose",
    ...
}
...
```

The columns you write in the Excel file should be `..., "owner", ... "address.street", "address.city" ...`.

**Note: The Excel file should be created each time the `/step8` endpoint is called.**

## Step 9: Convert Images to Video

For this step define a new endpoint `/step9` that returns a video created from the data of [this API](http://interview.surya-digital.in/get-products).

In the response of the API, you will find a property for the images of each product. The images need to be put together in a video. The video should have the following properties:

1. The images from the get-products API must be used each time the your `/step9` API is called.
2. Each image is shown for a duration of 5 seconds in the video. The order of the images in the video should be the same as they are in the API response.
3. There should be a cross-fade transition of 2 seconds between each image of the video. If you're unsure of what this effect looks like, feel free to look it up.
4. The video should have a resolution of 1280×720 px.

**Note: The video creation from the images in the API response should happen each time the `/step9` endpoint is called.**
