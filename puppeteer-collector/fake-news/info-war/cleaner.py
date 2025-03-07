import pandas as pd

# Step 1: Read the CSV file using pandas
data = pd.read_csv(r"scraped_data.csv")

# Display the first 10 rows of the data
print(data.head(10))

# Function to clean the links
def clean_links(link):
    # Remove the redundant prefix from the link
    return link.replace("https://www.infowars.com", "", 1)

# Apply the cleaning function to the 'link' column
data['link'] = data['link'].apply(clean_links)

# Display the cleaned data
print(data.head(10))

# Step 4: Save the cleaned data back to a CSV file
data.to_csv(r"cleaned_scraped_data.csv", index=False)

print("Cleaned data saved to 'cleaned_scraped_data.csv'")