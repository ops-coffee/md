/**
 * PDF 导出核心函数
 */
function downloadPdf() {
  const element = document.getElementById('render_output_id');
  const filenameWithDate = 'report_' + new Date().toISOString().slice(0, 10) + '.pdf';

  // 优化后的配置选项
  const options = {
    margin:       [10, 10, 10, 10], // 上下左右边距统一为 10mm
    filename:     filenameWithDate,
    image:        { type: 'jpeg', quality: 0.95 },

    // 关键优化：提高 scale 到 3，解决模糊/生硬问题
    html2canvas:  {
      scale: 3,
      useCORS: true,
      logging: false
    },

    jsPDF:        {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },

    // 关键优化：启用 CSS 分页模式，配合 @media print 样式
    pagebreak: {
      mode: ['css', 'legacy']
    }
  };

  // 异步生成PDF
  html2pdf().set(options).from(element).save()
    .then(() => console.log('PDF 导出成功'))
    .catch(err => {
        console.error('PDF 导出错误详情:', err);
        alert('PDF 导出失败，请检查控制台错误信息。');
    });
}


/**
 * 图片上传逻辑处理函数
 */
async function imageUploadHandler(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const uploadTip = document.createElement('div');
    uploadTip.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: rgba(0, 0, 0, 0.7); color: white;
        padding: 10px 20px; border-radius: 4px; z-index: 9999;
    `;
    document.body.appendChild(uploadTip);

    const currentYear = new Date().getFullYear();
    const editor = document.getElementById('editor');
    let uploadedCount = 0;

    try {
        for (const file of files) {
            uploadTip.textContent = `正在上传 ${uploadedCount + 1}/${files.length}`;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', `/static/images/${currentYear}/`);

            const response = await fetch('/storage/upload/', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'X-CSRFToken': document.cookie.match(/csrftoken=([\w-]+)/)?.[1] || '',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();
            if (!response.ok || data.state !== 1) {
                throw new Error(`上传失败: ${data.message || '未知错误'}`);
            }

            const imageUrl = `${data.data.cloudflare.domain}/${data.data.lPage[0].name}`;
            const imageMarkdown = `![](${imageUrl})\n`;

            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const text = editor.value;
            editor.value = text.substring(0, start) + imageMarkdown + text.substring(end);
            editor.selectionStart = editor.selectionEnd = start + imageMarkdown.length;

            uploadedCount++;
        }

        uploadTip.textContent = `成功上传 ${uploadedCount}/${files.length} 个文件`;
        setTimeout(() => { uploadTip.remove(); }, 3000);
    } catch (error) {
        console.error('上传失败:', error);
        alert(`图片上传失败，请重试。详情: ${error.message}`);
        if (uploadTip) uploadTip.remove();
    }

    e.target.value = '';
}

/**
 * 页面加载完成后，绑定事件监听器
 */
document.addEventListener('DOMContentLoaded', () => {
    // PDF 下载按钮的点击事件
    const downloadBtn = document.getElementById('download_btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPdf);
    }

    // 图片上传按钮和文件输入框的事件
    const uploadImageBtn = document.getElementById('upload_image');
    const imageUploadInput = document.getElementById('image_upload_input');

    if (uploadImageBtn && imageUploadInput) {
        uploadImageBtn.addEventListener('click', () => {
            imageUploadInput.click();
        });

        imageUploadInput.addEventListener('change', imageUploadHandler);
    }
});