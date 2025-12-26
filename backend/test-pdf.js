// Test script to diagnose PDF-to-image conversion
const fs = require('fs');
const path = require('path');

async function testPdfToImg() {
    console.log('🧪 Testing pdf-to-img...\n');
    
    // Find a PDF file in uploads directory
    const uploadsDir = path.join(__dirname, 'src/uploads');
    let testPdfPath = null;
    
    if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const pdfFile = files.find(f => f.endsWith('.pdf'));
        if (pdfFile) {
            testPdfPath = path.join(uploadsDir, pdfFile);
        }
    }
    
    if (!testPdfPath) {
        console.log('No PDF found in uploads. Creating test with sample path...');
        testPdfPath = 'C:/test.pdf'; // This will fail, but we want to see the error
    }
    
    console.log('Test PDF path:', testPdfPath);
    console.log('File exists:', fs.existsSync(testPdfPath));
    
    try {
        console.log('\n📦 Importing pdf-to-img...');
        const pdfToImg = await import('pdf-to-img');
        console.log('✅ Module imported successfully');
        console.log('Available exports:', Object.keys(pdfToImg));
        
        if (!fs.existsSync(testPdfPath)) {
            console.log('\n⚠️ No test PDF file available. Please upload a PDF first.');
            return;
        }
        
        console.log('\n📄 Converting PDF...');
        const { pdf } = pdfToImg;
        const document = await pdf(testPdfPath, { scale: 1.0 });
        
        console.log('\n📄 Iterating pages...');
        let pageNum = 0;
        for await (const image of document) {
            pageNum++;
            console.log(`  Page ${pageNum}: ${image.length} bytes`);
            
            // Save first page as test
            if (pageNum === 1) {
                const testPath = path.join(__dirname, 'test-slide.png');
                fs.writeFileSync(testPath, image);
                console.log(`  ✅ Saved test image: ${testPath}`);
            }
        }
        
        console.log(`\n✅ SUCCESS! Converted ${pageNum} pages`);
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nFull error:', error);
    }
}

testPdfToImg();
