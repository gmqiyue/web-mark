const DocSection2: React.FC = () => {
  return (
    <section>
      <h1>划词评论基本交互功能演示</h1>
      <p>主要演示划词部分，这是实现难点，评论功能因为出入较大，这里简单走个过场，具体细节大家自己实现。</p>
      <p>本演示为原生语言，如果大家使用Vue或React开发，稍微换换格式就可以了，兼容的，通用的哈~</p>
      <p>由于gitee page只支持静态页面，因此，相关请求都是死数据，或者使用console示意一下。</p>
      <h3>关于测试内容</h3>
      <p>其中第一段为非编辑态，演示划词交互能力；第二段是编辑态，演示如何实时保存编辑后的选区起止位置和内容。</p>
    </section>
  );
};

export default DocSection2;
