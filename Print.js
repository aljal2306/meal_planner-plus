// Add your Supabase credentials here
const SUPABASE_URL = 'https://gwrrzrxujbpnguyzpjme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cnJ6cnh1amJwbmd1eXpwam1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjY2MTMsImV4cCI6MjA3MTY0MjYxM30.tkE0LawKsbolBHrqaS3iJno-LAd7skpl9pCQ-0Tuf1w';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const cookbookContent = document.getElementById('cookbook-content');

// This function runs as soon as the page loads
async function loadSelectedRecipes() {
    // 1. Get the recipe IDs from the URL
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');

    if (!ids) {
        cookbookContent.innerHTML = '<h2>No recipes selected.</h2><p><a href="index.html">Go back</a> to select recipes.</p>';
        return;
    }

    const selectedIds = ids.split(',');

    // 2. Fetch only the selected recipes from Supabase
    const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .in('id', selectedIds)
        .order('name');

    if (error) {
        console.error('Error fetching selected recipes:', error);
        cookbookContent.innerHTML = '<h2>Could not load recipes.</h2>';
        return;
    }
    
    // 3. Display the recipes on the page
    let html = '<h1>My Cookbook</h1>';
    recipes.forEach(r => {
        html += `
            <div class="recipe-print">
                <h2>${r.name}</h2>
                <p><strong>Category:</strong> ${r.category || 'N/A'}</p>
                <h3>Ingredients</h3>
                <ul>${r.ingredients.map(i => `<li>${i.qty} ${i.unit || ''} ${i.name}</li>`).join('')}</ul>
                <h3>Instructions</h3>
                <ol>${r.instructions.map(s => `<li>${s}</li>`).join('')}</ol>
            </div>
        `;
    });
    cookbookContent.innerHTML = html;
}

// Load the recipes when the DOM is ready
document.addEventListener('DOMContentLoaded', loadSelectedRecipes);

