import pandas as pd

# Step 1: Read the CSV file using pandas
df = pd.read_csv(r"C:\Users\agaro\Documents\GitHub\Chiron\dataset_collector\dataset4.csv")

# Step 2: Add 'annotation' column with a value of 0 for each row
df['annotation'] = 1

# Step 3: Write the updated DataFrame to a CSV file
df.to_csv('annotated_dataset4.csv', index=False)
# df.to_csv('annotated_gma.csv', mode='a', index=False, header=False)

print("Data processing complete. Check 'chiron.csv' for the results.")

# Add debugging print statements to check the data
# print("\nDebugging Information:")
# print("First row link:", df['link'].iloc[0])
# print("First row title:", df['title'].iloc[0])
# print("First row content:", df['content'].iloc[0])
# print("Number of rows in final dataframe:", len(df))
